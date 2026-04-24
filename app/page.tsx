"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const allowedUsers = [
  { username: "pierre-luc", code: "0580", name: "Pierre-Luc" },
  { username: "veronique", code: "5926", name: "Véronique" },
];

const YEAR_PREFIX = "26";
const NEXT_PROJECT_KEY = "eric-next-project-number-26";
const PROJECTS_KEY = "eric-projects";
const CLIENTS_KEY = "eric-clients";
const ITEMS_BANK_KEY = "eric-items-bank";

type StatusType =
  | "À soumissionner"
  | "Soumission envoyée"
  | "Exécution"
  | "Perdu"
  | "Terminé"
  | "Non utilisé";

type ClientStatus = "Nouveau" | "Actif" | "Bloqué";
type QuoteStatus = "Actif" | "Envoyé" | "Non-retenu";

type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

type ClientRecord = {
  id: string;
  name: string;
  status: ClientStatus;
  contacts: Contact[];
};

type ProjectDocument = {
  id: string;
  name: string;
  url: string;
  pathname: string;
  uploadedAt: string;
};

type ItemBank = {
  id: string;
  name: string;
  price: number;
};

type QuoteLine = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type Quote = {
  id: string;
  name: string;
  status: QuoteStatus;
  date: string;
  lines: QuoteLine[];
  generatedPdf?: ProjectDocument | null;
};

type Project = {
  id: number;
  numeroProjet: string;
  numeroClient: string;
  client: string;
  contactId: string;
  statut: StatusType;
  charge: string;
  ville: string;
  endroit: string;
  description: string;
  poNumber: string;
  documents: ProjectDocument[];
  soumissions: Quote[];
  createdAt: string;
};

type ActiveSection = "projets" | "plans" | "clients" | "facturation";
type ViewMode = "list" | "project";
type ProjectPanel = "fiche" | "soumission";

const ALL_STATUSES: StatusType[] = [
  "À soumissionner",
  "Soumission envoyée",
  "Exécution",
  "Perdu",
  "Terminé",
  "Non utilisé",
];

const CLIENT_STATUSES: ClientStatus[] = ["Nouveau", "Actif", "Bloqué"];
const QUOTE_STATUSES: QuoteStatus[] = ["Actif", "Envoyé", "Non-retenu"];

const EMPTY_PROJECT: Project = {
  id: 0,
  numeroProjet: "",
  numeroClient: "",
  client: "",
  contactId: "",
  statut: "À soumissionner",
  charge: "",
  ville: "",
  endroit: "",
  description: "",
  poNumber: "",
  documents: [],
  soumissions: [],
  createdAt: "",
};

function makeProjectNumber(nextNumber: number) {
  return `${YEAR_PREFIX}-${String(nextNumber).padStart(4, "0")}`;
}

function formatDisplayDate(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return Number.isNaN(date.getTime())
    ? dateString
    : date.toLocaleDateString("fr-CA");
}

function money(value: number) {
  return value.toLocaleString("fr-CA", {
    style: "currency",
    currency: "CAD",
  });
}

function getStatusBadgeClasses(status: StatusType) {
  switch (status) {
    case "À soumissionner":
      return "bg-zinc-300 text-black";
    case "Soumission envoyée":
      return "bg-yellow-400 text-black";
    case "Exécution":
      return "bg-green-600 text-white";
    case "Perdu":
      return "bg-red-600 text-white";
    case "Terminé":
      return "bg-blue-600 text-white";
    case "Non utilisé":
      return "bg-zinc-600 text-white";
    default:
      return "bg-zinc-300 text-black";
  }
}

function getClientStatusBadgeClasses(status: ClientStatus) {
  switch (status) {
    case "Nouveau":
      return "bg-blue-500 text-white";
    case "Actif":
      return "bg-green-600 text-white";
    case "Bloqué":
      return "bg-red-600 text-white";
    default:
      return "bg-zinc-500 text-white";
  }
}

function getQuoteStatusBadgeClasses(status: QuoteStatus) {
  switch (status) {
    case "Actif":
      return "bg-green-600 text-white";
    case "Envoyé":
      return "bg-blue-600 text-white";
    case "Non-retenu":
      return "bg-red-600 text-white";
    default:
      return "bg-zinc-500 text-white";
  }
}

function normalizeProject(raw: Partial<Project>, index: number): Project {
  return {
    id: raw.id ?? Date.now() + index,
    numeroProjet: raw.numeroProjet ?? makeProjectNumber(index + 1),
    numeroClient: raw.numeroClient ?? "",
    client: raw.client ?? "",
    contactId: raw.contactId ?? "",
    statut: raw.statut ?? "À soumissionner",
    charge: raw.charge ?? "",
    ville: raw.ville ?? "",
    endroit: raw.endroit ?? "",
    description: raw.description ?? "",
    poNumber: raw.poNumber ?? "",
    documents:
      raw.documents?.map((doc) => ({
        id: doc.id,
        name: doc.name,
        url: doc.url,
        pathname: doc.pathname ?? "",
        uploadedAt: doc.uploadedAt,
      })) ?? [],
    soumissions:
      raw.soumissions?.map((quote) => ({
        id: quote.id,
        name: quote.name,
        status: quote.status ?? "Actif",
        date: quote.date,
        lines:
          quote.lines?.map((line) => ({
            id: line.id,
            name: line.name,
            price: Number(line.price) || 0,
            quantity: Number(line.quantity) || 1,
          })) ?? [],
        generatedPdf: quote.generatedPdf ?? null,
      })) ?? [],
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

function normalizeClients(raw: Partial<ClientRecord>[]): ClientRecord[] {
  return raw.map((client, index) => ({
    id: client.id ?? crypto.randomUUID(),
    name: client.name ?? `Client ${index + 1}`,
    status: client.status ?? "Nouveau",
    contacts:
      client.contacts?.map((contact) => ({
        id: contact.id ?? crypto.randomUUID(),
        name: contact.name ?? "",
        phone: contact.phone ?? "",
        email: contact.email ?? "",
      })) ?? [],
  }));
}

function normalizeItems(raw: Partial<ItemBank>[]): ItemBank[] {
  return raw.map((item, index) => ({
    id: item.id ?? crypto.randomUUID(),
    name: item.name ?? `Item ${index + 1}`,
    price: Number(item.price) || 0,
  }));
}

function getPrivateBlobOpenUrl(pathname: string, fallbackUrl: string) {
  if (pathname) {
    return `/api/blob/download?pathname=${encodeURIComponent(pathname)}`;
  }
  return fallbackUrl;
}

function getPreparedBy(userName: string) {
  if (userName === "Véronique") {
    return {
      name: "Véronique",
      phone: "819-678-6066",
    };
  }

  return {
    name: "Pierre-Luc",
    phone: "819-314-1262",
  };
}

export default function Home() {
  const quotePdfRef = useRef<HTMLDivElement | null>(null);

  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const [activeSection, setActiveSection] =
    useState<ActiveSection>("projets");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [projectPanel, setProjectPanel] = useState<ProjectPanel>("fiche");

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null
  );
  const [projectForm, setProjectForm] = useState<Project>(EMPTY_PROJECT);

  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientStatus, setNewClientStatus] =
    useState<ClientStatus>("Nouveau");
  const [selectedClientForContact, setSelectedClientForContact] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");

  const [clientListSearch, setClientListSearch] = useState("");
  const [contactListSearch, setContactListSearch] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState<
    "Tous" | ClientStatus
  >("Tous");

  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({
    client: "",
    ville: "",
    description: "",
  });

  const [searchNumero, setSearchNumero] = useState("");
  const [searchClient, setSearchClient] = useState("");
  const [searchVille, setSearchVille] = useState("");
  const [chargeFilter, setChargeFilter] = useState<"tous" | "mes-projets">(
    "tous"
  );
  const [statusFilters, setStatusFilters] =
    useState<StatusType[]>(ALL_STATUSES);

  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [itemsBank, setItemsBank] = useState<ItemBank[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newQuoteName, setNewQuoteName] = useState("");
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    const savedUser = localStorage.getItem("eric-user");
    const savedProjects = localStorage.getItem(PROJECTS_KEY);
    const savedClients = localStorage.getItem(CLIENTS_KEY);
    const savedItems = localStorage.getItem(ITEMS_BANK_KEY);
    const savedSection = localStorage.getItem("eric-section") as
      | ActiveSection
      | null;

    if (savedUser) setLoggedInUser(savedUser);

    let normalizedProjects: Project[] = [];

    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects) as Partial<Project>[];
        normalizedProjects = parsed.map((project, index) =>
          normalizeProject(project, index)
        );
        setProjects(normalizedProjects);
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(normalizedProjects));
      } catch {
        setProjects([]);
      }
    }

    if (savedClients) {
      try {
        const parsed = JSON.parse(savedClients) as Partial<ClientRecord>[];
        const normalized = normalizeClients(parsed);
        setClients(normalized);
        localStorage.setItem(CLIENTS_KEY, JSON.stringify(normalized));
      } catch {
        setClients([]);
      }
    }

    if (savedItems) {
      try {
        const parsed = JSON.parse(savedItems) as Partial<ItemBank>[];
        setItemsBank(normalizeItems(parsed));
      } catch {
        setItemsBank([
          {
            id: crypto.randomUUID(),
            name: "Plan de signalisation",
            price: 300,
          },
        ]);
      }
    } else {
      setItemsBank([
        {
          id: crypto.randomUUID(),
          name: "Plan de signalisation",
          price: 300,
        },
      ]);
    }

    if (
      savedSection === "projets" ||
      savedSection === "plans" ||
      savedSection === "clients" ||
      savedSection === "facturation"
    ) {
      setActiveSection(savedSection);
    }

    if (!localStorage.getItem(NEXT_PROJECT_KEY)) {
      const maxExisting = normalizedProjects.reduce((max, project) => {
        const numericPart = Number(project.numeroProjet.split("-")[1] || "0");
        return Number.isFinite(numericPart) ? Math.max(max, numericPart) : max;
      }, 0);

      localStorage.setItem(
        NEXT_PROJECT_KEY,
        String(maxExisting > 0 ? maxExisting + 1 : 1)
      );
    }

    setIsLoaded(true);
  }, []);

  const persistProjects = (updatedProjects: Project[]) => {
    setProjects(updatedProjects);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updatedProjects));
  };

  const persistClients = (updatedClients: ClientRecord[]) => {
    setClients(updatedClients);
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(updatedClients));
  };

  const persistItemsBank = (updatedItems: ItemBank[]) => {
    setItemsBank(updatedItems);
    localStorage.setItem(ITEMS_BANK_KEY, JSON.stringify(updatedItems));
  };

  const persistProjectForm = (updatedProject: Project) => {
    setProjectForm(updatedProject);

    if (selectedProjectId !== null) {
      const updatedProjects = projects.map((project) =>
        project.id === selectedProjectId ? updatedProject : project
      );
      persistProjects(updatedProjects);
    }
  };

  const selectedClient = clients.find(
    (client) => client.name === projectForm.client
  );

  const selectedContact = selectedClient?.contacts.find(
    (contact) => contact.id === projectForm.contactId
  );

  const filteredClientNames = clients.filter((client) =>
    client.name
      .toLowerCase()
      .includes(selectedClientForContact.toLowerCase().trim())
  );

  const filteredClientsForList = useMemo(() => {
    return clients.filter((client) => {
      const clientOk = client.name
        .toLowerCase()
        .includes(clientListSearch.toLowerCase().trim());

      const contactOk =
        contactListSearch.trim() === "" ||
        client.contacts.some(
          (contact) =>
            contact.name
              .toLowerCase()
              .includes(contactListSearch.toLowerCase().trim()) ||
            contact.email
              .toLowerCase()
              .includes(contactListSearch.toLowerCase().trim()) ||
            contact.phone
              .toLowerCase()
              .includes(contactListSearch.toLowerCase().trim())
        );

      const statusOk =
        clientStatusFilter === "Tous" || client.status === clientStatusFilter;

      return clientOk && contactOk && statusOk;
    });
  }, [clients, clientListSearch, contactListSearch, clientStatusFilter]);

  const activeQuote = projectForm.soumissions.find(
    (quote) => quote.id === activeQuoteId
  );

  const quoteTotal =
    activeQuote?.lines.reduce(
      (total, line) => total + line.price * line.quantity,
      0
    ) ?? 0;

  const preparedBy = getPreparedBy(projectForm.charge || loggedInUser || "");

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const match = allowedUsers.find(
      (user) =>
        user.username.toLowerCase() === username.toLowerCase().trim() &&
        user.code === code.trim()
    );

    if (!match) {
      setError("Identifiant ou code d’accès invalide.");
      return;
    }

    setError("");
    setLoggedInUser(match.name);
    setActiveSection("projets");
    localStorage.setItem("eric-user", match.name);
    localStorage.setItem("eric-section", "projets");
  };

  const handleLogout = () => {
    localStorage.removeItem("eric-user");
    localStorage.removeItem("eric-section");
    setLoggedInUser(null);
    setUsername("");
    setCode("");
    setError("");
    setViewMode("list");
    setSelectedProjectId(null);
  };

  const changeSection = (section: ActiveSection) => {
    setActiveSection(section);
    localStorage.setItem("eric-section", section);
    setViewMode("list");
  };

  const toggleStatusFilter = (status: StatusType) => {
    setStatusFilters((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const updateClientStatus = (clientName: string, status: ClientStatus) => {
    const updated = clients.map((client) =>
      client.name === clientName ? { ...client, status } : client
    );

    persistClients(updated);
  };

  const addClient = () => {
    if (!newClientName.trim()) return;

    const name = newClientName.trim();
    const alreadyExists = clients.some(
      (client) => client.name.toLowerCase() === name.toLowerCase()
    );

    if (alreadyExists) {
      setSelectedClientForContact(name);
      setNewClientName("");
      return;
    }

    const updated = [
      ...clients,
      {
        id: crypto.randomUUID(),
        name,
        status: newClientStatus,
        contacts: [],
      },
    ];

    persistClients(updated);
    setSelectedClientForContact(name);
    setNewClientName("");
    setNewClientStatus("Nouveau");
  };

  const addContact = () => {
    if (!selectedClientForContact.trim() || !newContactName.trim()) return;

    const clientName = selectedClientForContact.trim();

    const updated = clients.map((client) => {
      if (client.name.toLowerCase() !== clientName.toLowerCase()) return client;

      return {
        ...client,
        contacts: [
          ...client.contacts,
          {
            id: crypto.randomUUID(),
            name: newContactName.trim(),
            phone: newContactPhone.trim(),
            email: newContactEmail.trim(),
          },
        ],
      };
    });

    persistClients(updated);
    setNewContactName("");
    setNewContactPhone("");
    setNewContactEmail("");
  };

  const addProject = () => {
    if (!loggedInUser) return;

    if (
      !newProject.client.trim() ||
      !newProject.ville.trim() ||
      !newProject.description.trim()
    ) {
      return;
    }

    const nextNumber = Number(localStorage.getItem(NEXT_PROJECT_KEY) || "1");
    const clientName = newProject.client.trim();

    const existingClient = clients.find(
      (client) => client.name.toLowerCase() === clientName.toLowerCase()
    );

    if (!existingClient) {
      persistClients([
        ...clients,
        {
          id: crypto.randomUUID(),
          name: clientName,
          status: "Nouveau",
          contacts: [],
        },
      ]);
    }

    const newEntry: Project = {
      id: Date.now(),
      numeroProjet: makeProjectNumber(nextNumber),
      numeroClient: "",
      client: clientName,
      contactId: "",
      statut: "À soumissionner",
      charge: loggedInUser,
      ville: newProject.ville.trim(),
      endroit: "",
      description: newProject.description.trim(),
      poNumber: "",
      documents: [],
      soumissions: [],
      createdAt: new Date().toISOString(),
    };

    persistProjects([...projects, newEntry]);
    localStorage.setItem(NEXT_PROJECT_KEY, String(nextNumber + 1));

    setShowModal(false);
    setNewProject({ client: "", ville: "", description: "" });
  };

  const openProject = (project: Project) => {
    setSelectedProjectId(project.id);
    setProjectForm(project);
    setProjectPanel("fiche");
    setActiveQuoteId(project.soumissions[0]?.id ?? null);
    setUploadError("");
    setPdfError("");
    setViewMode("project");
  };

  const saveProject = () => {
    if (selectedProjectId === null) return;

    const updatedProjects = projects.map((project) =>
      project.id === selectedProjectId ? projectForm : project
    );

    persistProjects(updatedProjects);
    setViewMode("list");
  };

  const createQuote = () => {
    const defaultName = `${projectForm.numeroProjet}_PLAN`;

    const quote: Quote = {
      id: crypto.randomUUID(),
      name: newQuoteName.trim() || defaultName,
      status: "Actif",
      date: new Date().toISOString(),
      lines: [],
      generatedPdf: null,
    };

    const updatedProject = {
      ...projectForm,
      soumissions: [...projectForm.soumissions, quote],
    };

    persistProjectForm(updatedProject);
    setActiveQuoteId(quote.id);
    setNewQuoteName("");
  };

  const updateQuoteStatus = (quoteId: string, status: QuoteStatus) => {
    const updatedProject = {
      ...projectForm,
      soumissions: projectForm.soumissions.map((quote) =>
        quote.id === quoteId ? { ...quote, status } : quote
      ),
    };

    persistProjectForm(updatedProject);
  };

  const addItemToBank = () => {
    if (!newItemName.trim() || !newItemPrice.trim()) return;

    const price = Number(newItemPrice.replace(",", "."));

    if (!Number.isFinite(price)) return;

    persistItemsBank([
      ...itemsBank,
      {
        id: crypto.randomUUID(),
        name: newItemName.trim(),
        price,
      },
    ]);

    setNewItemName("");
    setNewItemPrice("");
  };

  const removeItemFromBank = (itemId: string) => {
    persistItemsBank(itemsBank.filter((item) => item.id !== itemId));
  };

  const addLineToQuote = (item: ItemBank) => {
    if (!activeQuote) return;

    const updatedProject = {
      ...projectForm,
      soumissions: projectForm.soumissions.map((quote) =>
        quote.id === activeQuote.id
          ? {
              ...quote,
              lines: [
                ...quote.lines,
                {
                  id: crypto.randomUUID(),
                  name: item.name,
                  price: item.price,
                  quantity: 1,
                },
              ],
            }
          : quote
      ),
    };

    persistProjectForm(updatedProject);
  };

  const updateQuoteLineQuantity = (lineId: string, quantity: number) => {
    if (!activeQuote) return;

    const updatedProject = {
      ...projectForm,
      soumissions: projectForm.soumissions.map((quote) =>
        quote.id === activeQuote.id
          ? {
              ...quote,
              lines: quote.lines.map((line) =>
                line.id === lineId
                  ? { ...line, quantity: Math.max(quantity, 0) }
                  : line
              ),
            }
          : quote
      ),
    };

    persistProjectForm(updatedProject);
  };

  const removeQuoteLine = (lineId: string) => {
    if (!activeQuote) return;

    const updatedProject = {
      ...projectForm,
      soumissions: projectForm.soumissions.map((quote) =>
        quote.id === activeQuote.id
          ? {
              ...quote,
              lines: quote.lines.filter((line) => line.id !== lineId),
            }
          : quote
      ),
    };

    persistProjectForm(updatedProject);
  };

  const uploadPdfBlob = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectForm.numeroProjet || "default");

    const response = await fetch("/api/blob/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload PDF failed");
    }

    return (await response.json()) as {
      url: string;
      pathname: string;
    };
  };

  const generateQuotePdf = async () => {
    if (!activeQuote || !quotePdfRef.current) return;

    setPdfError("");
    setIsGeneratingPdf(true);

    try {
      const canvas = await html2canvas(quotePdfRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "letter");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const safeName = activeQuote.name.replace(/[^\w\-]+/g, "_");
      const fileName = `${safeName}.pdf`;
      const pdfBlob = pdf.output("blob");
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      const data = await uploadPdfBlob(file);

      const generatedDoc: ProjectDocument = {
        id: crypto.randomUUID(),
        name: fileName,
        url: data.url,
        pathname: data.pathname,
        uploadedAt: new Date().toISOString(),
      };

      const updatedProject = {
        ...projectForm,
        documents: [...projectForm.documents, generatedDoc],
        soumissions: projectForm.soumissions.map((quote) =>
          quote.id === activeQuote.id
            ? { ...quote, generatedPdf: generatedDoc }
            : quote
        ),
      };

      persistProjectForm(updatedProject);
    } catch (err) {
      console.error(err);
      setPdfError("Impossible de générer le PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleBlobUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setIsUploadingDoc(true);

    try {
      const data = await uploadPdfBlob(file);

      const newDocument: ProjectDocument = {
        id: crypto.randomUUID(),
        name: file.name,
        url: data.url,
        pathname: data.pathname,
        uploadedAt: new Date().toISOString(),
      };

      const updatedProject: Project = {
        ...projectForm,
        documents: [...projectForm.documents, newDocument],
      };

      persistProjectForm(updatedProject);
    } catch (err) {
      console.error(err);
      setUploadError("Impossible de téléverser le PDF.");
    } finally {
      setIsUploadingDoc(false);
      e.target.value = "";
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const numeroOk = project.numeroProjet
        .toLowerCase()
        .includes(searchNumero.toLowerCase().trim());

      const clientOk = project.client
        .toLowerCase()
        .includes(searchClient.toLowerCase().trim());

      const villeOk = project.ville
        .toLowerCase()
        .includes(searchVille.toLowerCase().trim());

      const chargeOk =
        chargeFilter === "tous" ? true : project.charge === loggedInUser;

      const statusOk = statusFilters.includes(project.statut);

      return numeroOk && clientOk && villeOk && chargeOk && statusOk;
    });
  }, [
    projects,
    searchNumero,
    searchClient,
    searchVille,
    chargeFilter,
    statusFilters,
    loggedInUser,
  ]);

  if (!isLoaded) return null;

  if (!loggedInUser) {
    return (
      <main className="relative h-screen overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-[20%_top]"
          style={{ backgroundImage: "url('/eric-login-bg.png')" }}
        />
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-10 flex h-full items-center justify-center px-4">
          <form
            onSubmit={handleLogin}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-black/80 p-8 text-white shadow-2xl backdrop-blur-md"
          >
            <h1 className="mb-2 text-2xl font-semibold">Connexion à ERIC</h1>
            <p className="mb-6 text-sm text-zinc-300">
              Entrez votre identifiant et votre code d’accès pour continuer.
            </p>

            <div className="mb-4">
              <label className="mb-2 block text-sm text-zinc-200">
                Identifiant
              </label>
              <input
                type="text"
                placeholder="Ex. user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400 focus:border-white/30"
              />
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm text-zinc-200">
                Code d’accès
              </label>
              <input
                type="password"
                placeholder="Entrez votre code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400 focus:border-white/30"
              />
            </div>

            {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-lg bg-white py-3 font-medium text-black transition hover:bg-zinc-200"
            >
              Se connecter
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (viewMode === "project") {
    return (
      <main className="relative min-h-screen overflow-hidden text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/eric-dashboard-bg.png')" }}
        />
        <div className="absolute inset-0 bg-black/68" />

        <div className="relative z-10 px-6 py-5 md:px-8 xl:px-10">
          <div className="mx-auto max-w-[1700px]">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-zinc-300">
                  ERIC
                </p>
                <h1 className="mt-1 text-2xl font-semibold">Fiche projet</h1>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setViewMode("list")}
                  className="rounded-lg border border-white/15 bg-black/30 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                >
                  Retour à la liste
                </button>

                <button
                  onClick={saveProject}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-400"
                >
                  Sauvegarder
                </button>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
              <button
                onClick={() => setProjectPanel("soumission")}
                className={`min-h-[90px] rounded-xl border-2 border-orange-400 text-3xl font-semibold transition ${
                  projectPanel === "soumission"
                    ? "bg-orange-500 text-black"
                    : "bg-transparent text-orange-400 hover:bg-orange-400/10"
                }`}
              >
                Estimation
              </button>

              <button className="min-h-[90px] rounded-xl border-2 border-orange-400 bg-transparent px-4 text-2xl font-semibold text-orange-400 transition hover:bg-orange-400/10">
                Bordereau de facturation
              </button>

              <button
                onClick={() => setProjectPanel("fiche")}
                className={`min-h-[90px] rounded-xl border-2 border-orange-400 text-3xl font-semibold transition ${
                  projectPanel === "fiche"
                    ? "bg-orange-500 text-black"
                    : "bg-transparent text-orange-400 hover:bg-orange-400/10"
                }`}
              >
                Projet
              </button>
            </div>

            {projectPanel === "soumission" ? (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-white/10 bg-black/35 p-5 shadow-2xl backdrop-blur-sm">
                  <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <h2 className="text-2xl font-semibold text-orange-400">
                      Soumission
                    </h2>

                    <div className="flex flex-wrap gap-3">
                      <input
                        value={newQuoteName}
                        onChange={(e) => setNewQuoteName(e.target.value)}
                        placeholder={`${projectForm.numeroProjet}_PLAN`}
                        className="rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-white outline-none placeholder:text-zinc-400"
                      />
                      <button
                        onClick={createQuote}
                        className="rounded-lg bg-orange-500 px-4 py-2 font-medium text-black transition hover:bg-orange-400"
                      >
                        + Nouvelle soumission
                      </button>
                    </div>
                  </div>

                  <div className="mb-5 flex flex-wrap gap-2">
                    {projectForm.soumissions.length === 0 ? (
                      <p className="text-sm text-zinc-400">
                        Aucune soumission pour ce projet.
                      </p>
                    ) : (
                      projectForm.soumissions.map((quote) => (
                        <button
                          key={quote.id}
                          onClick={() => setActiveQuoteId(quote.id)}
                          className={`rounded-lg border px-4 py-2 text-left text-sm transition ${
                            quote.id === activeQuoteId
                              ? "border-orange-400 bg-orange-500 text-black"
                              : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                          }`}
                        >
                          <div>{quote.name}</div>
                          <div
                            className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs ${getQuoteStatusBadgeClasses(
                              quote.status
                            )}`}
                          >
                            {quote.status}
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {activeQuote ? (
                    <>
                      <div className="mb-4 flex flex-wrap items-center gap-3">
                        <select
                          value={activeQuote.status}
                          onChange={(e) =>
                            updateQuoteStatus(
                              activeQuote.id,
                              e.target.value as QuoteStatus
                            )
                          }
                          className="rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-white outline-none"
                        >
                          {QUOTE_STATUSES.map((status) => (
                            <option
                              key={status}
                              value={status}
                              className="text-black"
                            >
                              {status}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={generateQuotePdf}
                          disabled={isGeneratingPdf}
                          className="rounded-lg bg-white px-4 py-2 font-medium text-black transition hover:bg-zinc-200 disabled:opacity-50"
                        >
                          {isGeneratingPdf
                            ? "Génération..."
                            : "Générer PDF"}
                        </button>

                        {activeQuote.generatedPdf && (
                          <a
                            href={getPrivateBlobOpenUrl(
                              activeQuote.generatedPdf.pathname,
                              activeQuote.generatedPdf.url
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
                          >
                            Ouvrir PDF généré
                          </a>
                        )}

                        {pdfError && (
                          <span className="text-sm text-red-400">
                            {pdfError}
                          </span>
                        )}
                      </div>

                      <div
                        ref={quotePdfRef}
                        className="mx-auto w-full max-w-[850px] rounded bg-white p-10 text-black"
                      >
                        <div className="mb-8 flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <img
                              src="/file.svg"
                              alt="Dynamique Expert-Conseil"
                              className="h-16 w-16 object-contain"
                            />
                            <div>
                              <div className="text-2xl font-bold tracking-wide">
                                DYNAMIQUE
                              </div>
                              <div className="text-sm font-semibold tracking-wide">
                                EXPERT-CONSEIL
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <h1 className="text-3xl font-bold text-orange-500">
                              SOUMISSION
                            </h1>
                            <p className="mt-2 text-sm font-semibold">
                              {activeQuote.name}
                            </p>
                          </div>
                        </div>

                        <div className="mb-6 grid grid-cols-2 gap-8 border-t border-zinc-300 pt-5">
                          <div>
                            <p className="mb-2 font-bold uppercase">
                              Présenté à
                            </p>
                            <p>
                              <strong>Entreprise :</strong>{" "}
                              {projectForm.client}
                            </p>
                            <p>
                              <strong>Contact :</strong>{" "}
                              {selectedContact?.name || ""}
                            </p>
                            <p>
                              <strong>Courriel :</strong>{" "}
                              {selectedContact?.email || ""}
                            </p>
                            <p>
                              <strong>No. Tel. :</strong>{" "}
                              {selectedContact?.phone || ""}
                            </p>
                          </div>

                          <div>
                            <p className="mb-2 font-bold uppercase">
                              Préparé par
                            </p>
                            <p>
                              <strong>Contact :</strong> {preparedBy.name}
                            </p>
                            <p>
                              <strong>No. Tel. :</strong> {preparedBy.phone}
                            </p>
                            <p>
                              <strong>Date :</strong>{" "}
                              {formatDisplayDate(activeQuote.date)}
                            </p>
                          </div>
                        </div>

                        <div className="mb-6">
                          <p>
                            <strong>O/S No.</strong>{" "}
                            {projectForm.numeroProjet}
                          </p>
                          <p>
                            <strong>No client.</strong>{" "}
                            {projectForm.numeroClient}
                          </p>
                        </div>

                        <div className="mb-6">
                          <p className="mb-2 font-bold uppercase">
                            Description du projet
                          </p>
                          <p>{projectForm.description}</p>
                        </div>

                        <div className="overflow-hidden border border-zinc-300">
                          <div className="grid grid-cols-[1.8fr_0.6fr_0.5fr_0.6fr_0.2fr] bg-zinc-200 p-2 text-sm font-bold uppercase">
                            <div>Item</div>
                            <div>Prix</div>
                            <div>Quantité</div>
                            <div>Total</div>
                            <div></div>
                          </div>

                          {activeQuote.lines.length === 0 ? (
                            <div className="p-4 text-sm text-zinc-500">
                              Aucun item ajouté.
                            </div>
                          ) : (
                            activeQuote.lines.map((line) => (
                              <div
                                key={line.id}
                                className="grid grid-cols-[1.8fr_0.6fr_0.5fr_0.6fr_0.2fr] items-center border-t border-zinc-200 p-2 text-sm"
                              >
                                <div>{line.name}</div>
                                <div>{money(line.price)}</div>
                                <div>
                                  <input
                                    type="number"
                                    min="0"
                                    value={line.quantity}
                                    onChange={(e) =>
                                      updateQuoteLineQuantity(
                                        line.id,
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-20 rounded border border-zinc-300 px-2 py-1"
                                  />
                                </div>
                                <div>{money(line.price * line.quantity)}</div>
                                <button
                                  onClick={() => removeQuoteLine(line.id)}
                                  className="text-red-600 print:hidden"
                                >
                                  X
                                </button>
                              </div>
                            ))
                          )}

                          <div className="grid grid-cols-[1.8fr_0.6fr_0.5fr_0.6fr_0.2fr] border-t border-zinc-400 bg-zinc-100 p-2 text-sm font-bold">
                            <div></div>
                            <div></div>
                            <div>Total</div>
                            <div>{money(quoteTotal)}</div>
                            <div></div>
                          </div>
                        </div>

                        <div className="mt-8 text-sm">
                          <p className="mb-2 font-bold uppercase">Notes</p>
                          <p>- Validité: 30 jours;</p>
                          <p>
                            - Responsabilité: Dynamique Expert-Conseil Inc.
                            décline toute responsabilité liée à l’installation
                            de la signalisation découlant d’un plan.
                          </p>
                          <p>- Paiement: Net 30 jours;</p>
                          <p>- Taxes: TPS et TVQ en sus.</p>
                        </div>

                        <div className="mt-10 grid grid-cols-2 gap-8 text-sm">
                          <div>
                            Approuvé par:
                            <div className="mt-6 border-b border-black"></div>
                          </div>
                          <div>
                            Bon de commande:
                            <div className="mt-6 border-b border-black"></div>
                          </div>
                        </div>

                        <div className="mt-10 text-sm">
                          <p className="font-semibold">
                            Dynamique Expert-Conseil Inc.
                          </p>
                          <p>44, Allée du refuge, Magog, Qc, J1X 8B5</p>
                          <p>(819) 678-6066 | info@dynamiqueexpert.ca</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-zinc-300">
                      Clique sur <strong>+ Nouvelle soumission</strong> pour
                      commencer.
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/35 p-5 shadow-2xl backdrop-blur-sm">
                  <h2 className="mb-4 text-xl font-semibold text-orange-400">
                    Banque d’items
                  </h2>

                  <div className="mb-5 space-y-3 rounded-xl border border-orange-400/30 p-4">
                    <input
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="Nom de l’item"
                      className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400"
                    />
                    <input
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      placeholder="Prix"
                      className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400"
                    />
                    <button
                      onClick={addItemToBank}
                      className="rounded-lg bg-orange-500 px-4 py-2 font-medium text-black transition hover:bg-orange-400"
                    >
                      Ajouter à la banque
                    </button>
                  </div>

                  <div className="space-y-3">
                    {itemsBank.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-white/10 bg-white/5 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-zinc-300">
                              {money(item.price)}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => addLineToQuote(item)}
                              className="rounded-lg border border-orange-400 px-3 py-2 text-sm text-orange-300 transition hover:bg-orange-400/10"
                            >
                              Ajouter
                            </button>
                            <button
                              onClick={() => removeItemFromBank(item.id)}
                              className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/35 p-5 shadow-2xl backdrop-blur-sm">
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="rounded-xl border border-orange-400/40 bg-black/20 p-5">
                    <h2 className="mb-5 text-xl font-semibold text-orange-400">
                      Informations projet
                    </h2>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm text-orange-400">
                          Numéro de projet
                        </label>
                        <input
                          value={projectForm.numeroProjet}
                          readOnly
                          className="w-full border-b-2 border-orange-400 bg-transparent px-2 py-2 text-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-orange-400">
                          Numéro client
                        </label>
                        <input
                          value={projectForm.numeroClient}
                          onChange={(e) =>
                            setProjectForm({
                              ...projectForm,
                              numeroClient: e.target.value,
                            })
                          }
                          placeholder="Ex. no interne client"
                          className="w-full border-b-2 border-orange-400 bg-transparent px-2 py-2 text-white outline-none placeholder:text-zinc-500"
                        />
                      </div>
                    </div>

                    <div className="mt-5">
                      <label className="mb-2 block text-sm text-orange-400">
                        Statut
                      </label>
                      <select
                        value={projectForm.statut}
                        onChange={(e) =>
                          setProjectForm({
                            ...projectForm,
                            statut: e.target.value as StatusType,
                          })
                        }
                        className="w-full border-b-2 border-orange-400 bg-transparent px-2 py-2 text-white outline-none"
                      >
                        {ALL_STATUSES.map((status) => (
                          <option
                            key={status}
                            value={status}
                            className="text-black"
                          >
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-5">
                      <label className="mb-2 block text-sm text-orange-400">
                        Ville
                      </label>
                      <input
                        value={projectForm.ville}
                        onChange={(e) =>
                          setProjectForm({
                            ...projectForm,
                            ville: e.target.value,
                          })
                        }
                        className="w-full border-b-2 border-orange-400 bg-transparent px-2 py-2 text-white outline-none"
                      />
                    </div>

                    <div className="mt-5">
                      <label className="mb-2 block text-sm text-orange-400">
                        Endroit
                      </label>
                      <input
                        value={projectForm.endroit}
                        onChange={(e) =>
                          setProjectForm({
                            ...projectForm,
                            endroit: e.target.value,
                          })
                        }
                        className="w-full border-b-2 border-orange-400 bg-transparent px-2 py-2 text-white outline-none"
                      />
                    </div>

                    <div className="mt-5">
                      <label className="mb-2 block text-sm text-orange-400">
                        Description
                      </label>
                      <textarea
                        value={projectForm.description}
                        onChange={(e) =>
                          setProjectForm({
                            ...projectForm,
                            description: e.target.value,
                          })
                        }
                        rows={4}
                        className="w-full border-b-2 border-orange-400 bg-transparent px-2 py-2 text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-orange-400/40 bg-black/20 p-5">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <h2 className="text-xl font-semibold text-orange-400">
                        Client et contacts
                      </h2>

                      <button
                        onClick={() => {
                          setShowClientModal(true);
                          setSelectedClientForContact(projectForm.client);
                        }}
                        className="rounded border border-orange-400 px-3 py-2 text-orange-400 transition hover:bg-orange-400/10"
                      >
                        +
                      </button>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-orange-400">
                        Client
                      </label>
                      <input
                        list="clients-list-project"
                        value={projectForm.client}
                        onChange={(e) =>
                          setProjectForm({
                            ...projectForm,
                            client: e.target.value,
                            contactId: "",
                          })
                        }
                        placeholder="Commencez à taper le nom du client"
                        className="w-full border-b-2 border-orange-400 bg-transparent px-2 py-2 text-white outline-none placeholder:text-zinc-500"
                      />
                      <datalist id="clients-list-project">
                        {clients.map((client) => (
                          <option key={client.id} value={client.name} />
                        ))}
                      </datalist>
                    </div>

                    <div className="mt-5">
                      <label className="mb-2 block text-sm text-orange-400">
                        Contact
                      </label>
                      <select
                        value={projectForm.contactId}
                        onChange={(e) =>
                          setProjectForm({
                            ...projectForm,
                            contactId: e.target.value,
                          })
                        }
                        className="w-full border-b-2 border-orange-400 bg-transparent px-2 py-2 text-white outline-none"
                      >
                        <option value="" className="text-black">
                          Sélectionner un contact
                        </option>
                        {selectedClient?.contacts.map((contact) => (
                          <option
                            key={contact.id}
                            value={contact.id}
                            className="text-black"
                          >
                            {contact.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm text-orange-400">
                          Téléphone
                        </label>
                        <input
                          value={selectedContact?.phone ?? ""}
                          readOnly
                          placeholder="Automatique selon le contact"
                          className="w-full border-b-2 border-orange-400 bg-transparent px-2 py-2 text-white outline-none placeholder:text-zinc-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-orange-400">
                          Courriel
                        </label>
                        <input
                          value={selectedContact?.email ?? ""}
                          readOnly
                          placeholder="Automatique selon le contact"
                          className="w-full border-b-2 border-orange-400 bg-transparent px-2 py-2 text-white outline-none placeholder:text-zinc-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-xl border border-orange-400/40 bg-black/20 p-4">
                    <p className="mb-4 text-xl text-orange-400">PO</p>

                    <div className="mb-4">
                      <label className="mb-2 block text-sm text-zinc-200">
                        Numéro de PO
                      </label>
                      <input
                        value={projectForm.poNumber}
                        onChange={(e) =>
                          setProjectForm({
                            ...projectForm,
                            poNumber: e.target.value,
                          })
                        }
                        placeholder="Inscrire le numéro de PO"
                        className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400"
                      />
                    </div>

                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <label className="cursor-pointer rounded-lg border border-orange-400 bg-orange-400/10 px-4 py-3 text-sm font-medium text-orange-300 transition hover:bg-orange-400/20">
                        {isUploadingDoc
                          ? "Upload en cours..."
                          : "Importer un PDF"}
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handleBlobUpload}
                          className="hidden"
                          disabled={isUploadingDoc}
                        />
                      </label>

                      {uploadError && (
                        <span className="text-sm text-red-400">
                          {uploadError}
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {projectForm.documents.length === 0 ? (
                        <p className="text-sm text-zinc-400">
                          Aucun PDF attaché pour le moment.
                        </p>
                      ) : (
                        projectForm.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-3 md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <p className="text-sm font-medium text-white">
                                {doc.name}
                              </p>
                              <p className="text-xs text-zinc-400">
                                Ajouté le {formatDisplayDate(doc.uploadedAt)}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <a
                                href={getPrivateBlobOpenUrl(
                                  doc.pathname,
                                  doc.url
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/20"
                              >
                                Ouvrir
                              </a>

                              <button
                                type="button"
                                onClick={() => {
                                  const updatedProject = {
                                    ...projectForm,
                                    documents: projectForm.documents.filter(
                                      (item) => item.id !== doc.id
                                    ),
                                  };

                                  persistProjectForm(updatedProject);
                                }}
                                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
                              >
                                Retirer
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex items-end justify-start lg:justify-end">
                    <div className="text-right">
                      <p className="text-lg text-zinc-200">
                        Fait par : {projectForm.charge}
                      </p>
                      <p className="mt-2 text-lg text-zinc-200">
                        Date : {formatDisplayDate(projectForm.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showClientModal && (
              <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 px-4">
                <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-black/95 p-6 text-white shadow-2xl">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">
                      Gestion clients / contacts
                    </h2>

                    <button
                      onClick={() => setShowClientModal(false)}
                      className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10"
                    >
                      Fermer
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="rounded-xl border border-orange-400/30 p-4">
                      <h3 className="mb-4 text-lg font-semibold text-orange-400">
                        Ajouter un client
                      </h3>

                      <input
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Nom du client"
                        className="mb-3 w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400"
                      />

                      <select
                        value={newClientStatus}
                        onChange={(e) =>
                          setNewClientStatus(e.target.value as ClientStatus)
                        }
                        className="mb-3 w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
                      >
                        {CLIENT_STATUSES.map((status) => (
                          <option
                            key={status}
                            value={status}
                            className="text-black"
                          >
                            {status}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={addClient}
                        className="rounded-lg bg-orange-500 px-4 py-2 font-medium text-white transition hover:bg-orange-400"
                      >
                        Ajouter client
                      </button>

                      <div className="mt-5 max-h-64 space-y-2 overflow-auto">
                        {clients.map((client) => (
                          <button
                            key={client.id}
                            onClick={() =>
                              setSelectedClientForContact(client.name)
                            }
                            className={`block w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                              selectedClientForContact === client.name
                                ? "border-orange-400 bg-orange-400/15"
                                : "border-white/10 bg-white/5 hover:bg-white/10"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span>{client.name}</span>
                              <span
                                className={`rounded-full px-2 py-1 text-xs ${getClientStatusBadgeClasses(
                                  client.status
                                )}`}
                              >
                                {client.status}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-orange-400/30 p-4">
                      <h3 className="mb-4 text-lg font-semibold text-orange-400">
                        Ajouter un contact
                      </h3>

                      <input
                        list="clients-list-contact-modal"
                        value={selectedClientForContact}
                        onChange={(e) =>
                          setSelectedClientForContact(e.target.value)
                        }
                        placeholder="Commencez à taper le client"
                        className="mb-3 w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400"
                      />
                      <datalist id="clients-list-contact-modal">
                        {clients.map((client) => (
                          <option key={client.id} value={client.name} />
                        ))}
                      </datalist>

                      {selectedClientForContact &&
                        filteredClientNames.length > 0 && (
                          <div className="mb-3 rounded-lg border border-white/10 bg-white/5 p-2">
                            {filteredClientNames.slice(0, 6).map((client) => (
                              <button
                                key={client.id}
                                onClick={() =>
                                  setSelectedClientForContact(client.name)
                                }
                                className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-white/10"
                              >
                                {client.name}
                              </button>
                            ))}
                          </div>
                        )}

                      <input
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        placeholder="Nom du contact"
                        className="mb-3 w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400"
                      />

                      <input
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                        placeholder="Téléphone"
                        className="mb-3 w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400"
                      />

                      <input
                        value={newContactEmail}
                        onChange={(e) => setNewContactEmail(e.target.value)}
                        placeholder="Courriel"
                        className="mb-3 w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400"
                      />

                      <button
                        onClick={addContact}
                        className="rounded-lg bg-orange-500 px-4 py-2 font-medium text-white transition hover:bg-orange-400"
                      >
                        Ajouter contact
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/eric-dashboard-bg.png')" }}
      />
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10 min-h-screen px-6 py-5 md:px-8 xl:px-10">
        <div className="mx-auto w-full max-w-[1700px]">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-zinc-300">
                ERIC
              </p>
              <h1 className="mt-1 text-2xl font-semibold">Liste de projet</h1>
            </div>

            <div className="flex items-center gap-4">
              <p className="text-sm text-zinc-200">{loggedInUser}</p>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-white/15 bg-black/30 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                Déconnexion
              </button>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-4">
            {[
              ["projets", "Projet"],
              ["plans", "Liste de plan"],
              ["clients", "Client"],
              ["facturation", "Facturation"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => changeSection(key as ActiveSection)}
                className={`min-w-[120px] border-2 px-6 py-3 text-left transition ${
                  activeSection === key
                    ? "border-white bg-white text-black"
                    : "border-white/80 bg-black/20 text-white hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeSection === "projets" && (
            <>
              <div className="mb-5 grid gap-4 rounded-xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm lg:grid-cols-[0.7fr_1fr_1fr_1fr_1.2fr]">
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">
                    Recherche numéro
                  </label>
                  <input
                    value={searchNumero}
                    onChange={(e) => setSearchNumero(e.target.value)}
                    placeholder="Ex. 26-0001"
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-200">
                    Recherche client
                  </label>
                  <input
                    value={searchClient}
                    onChange={(e) => setSearchClient(e.target.value)}
                    placeholder="Nom du client"
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-200">
                    Recherche ville
                  </label>
                  <input
                    value={searchVille}
                    onChange={(e) => setSearchVille(e.target.value)}
                    placeholder="Ville"
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-200">
                    Chargé de projets
                  </label>
                  <select
                    value={chargeFilter}
                    onChange={(e) =>
                      setChargeFilter(
                        e.target.value as "tous" | "mes-projets"
                      )
                    }
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
                  >
                    <option value="tous" className="text-black">
                      Tous les projets
                    </option>
                    <option value="mes-projets" className="text-black">
                      Mes projets
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-200">
                    Statuts affichés
                  </label>
                  <div className="rounded-lg border border-white/10 bg-white/10 p-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {ALL_STATUSES.map((status) => (
                        <label
                          key={status}
                          className="flex items-center gap-2 text-zinc-200"
                        >
                          <input
                            type="checkbox"
                            checked={statusFilters.includes(status)}
                            onChange={() => toggleStatusFilter(status)}
                          />
                          {status}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-white/10 bg-black/35 shadow-2xl backdrop-blur-sm">
                <table className="w-full text-sm">
                  <thead className="bg-orange-500 text-black">
                    <tr>
                      <th className="p-3 text-left font-semibold">
                        Numéro projet
                      </th>
                      <th className="p-3 text-left font-semibold">
                        Numéro client
                      </th>
                      <th className="p-3 text-left font-semibold">Ville</th>
                      <th className="p-3 text-left font-semibold">Client</th>
                      <th className="p-3 text-left font-semibold">
                        Description
                      </th>
                      <th className="p-3 text-left font-semibold">Statut</th>
                      <th className="p-3 text-left font-semibold">Chargé</th>
                      <th className="p-3 text-left font-semibold">
                        Accès projet
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProjects.length === 0 ? (
                      <tr className="border-t border-white/10">
                        <td
                          colSpan={8}
                          className="p-6 text-center text-zinc-300"
                        >
                          Aucun projet pour le moment.
                        </td>
                      </tr>
                    ) : (
                      filteredProjects.map((project) => (
                        <tr
                          key={project.id}
                          className="border-t border-white/10 bg-black/15"
                        >
                          <td className="p-3 text-white">
                            {project.numeroProjet}
                          </td>
                          <td className="p-3 text-zinc-200">
                            {project.numeroClient}
                          </td>
                          <td className="p-3 text-zinc-200">
                            {project.ville}
                          </td>
                          <td className="p-3 text-white">{project.client}</td>
                          <td className="p-3 text-zinc-200">
                            {project.description}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(
                                project.statut
                              )}`}
                            >
                              {project.statut}
                            </span>
                          </td>
                          <td className="p-3 text-zinc-200">
                            {project.charge}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => openProject(project)}
                              className="rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/20"
                            >
                              Ouvrir ↗
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-5">
                <button
                  onClick={() => setShowModal(true)}
                  className="rounded-lg bg-white px-5 py-3 font-medium text-black transition hover:bg-zinc-200"
                >
                  + Nouveau projet
                </button>
              </div>
            </>
          )}

          {activeSection === "clients" && (
            <div className="rounded-xl border border-white/10 bg-black/35 p-6 backdrop-blur-sm">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="text-xl font-semibold">Clients / Contacts</h2>
                <button
                  onClick={() => setShowClientModal(true)}
                  className="rounded-lg bg-orange-500 px-4 py-2 font-medium text-white transition hover:bg-orange-400"
                >
                  + Gestion clients
                </button>
              </div>

              <div className="mb-5 grid gap-4 lg:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">
                    Recherche client
                  </label>
                  <input
                    value={clientListSearch}
                    onChange={(e) => setClientListSearch(e.target.value)}
                    placeholder="Nom du client"
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-200">
                    Recherche contact
                  </label>
                  <input
                    value={contactListSearch}
                    onChange={(e) => setContactListSearch(e.target.value)}
                    placeholder="Nom, téléphone ou courriel"
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-200">
                    Statut client
                  </label>
                  <select
                    value={clientStatusFilter}
                    onChange={(e) =>
                      setClientStatusFilter(
                        e.target.value as "Tous" | ClientStatus
                      )
                    }
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
                  >
                    <option value="Tous" className="text-black">
                      Tous
                    </option>
                    {CLIENT_STATUSES.map((status) => (
                      <option
                        key={status}
                        value={status}
                        className="text-black"
                      >
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredClientsForList.length === 0 ? (
                <p className="text-zinc-300">Aucun client trouvé.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {filteredClientsForList.map((client) => (
                    <div
                      key={client.id}
                      className="rounded-lg border border-white/10 bg-white/5 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-orange-400">
                          {client.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${getClientStatusBadgeClasses(
                              client.status
                            )}`}
                          >
                            {client.status}
                          </span>
                          <select
                            value={client.status}
                            onChange={(e) =>
                              updateClientStatus(
                                client.name,
                                e.target.value as ClientStatus
                              )
                            }
                            className="rounded border border-white/10 bg-black/40 px-2 py-1 text-sm text-white"
                          >
                            {CLIENT_STATUSES.map((status) => (
                              <option
                                key={status}
                                value={status}
                                className="text-black"
                              >
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {client.contacts.length === 0 ? (
                        <p className="text-sm text-zinc-400">Aucun contact.</p>
                      ) : (
                        <div className="space-y-2">
                          {client.contacts.map((contact) => (
                            <div
                              key={contact.id}
                              className="rounded border border-white/10 bg-black/20 p-3 text-sm"
                            >
                              <p className="font-semibold">{contact.name}</p>
                              <p className="text-zinc-300">{contact.phone}</p>
                              <p className="text-zinc-300">{contact.email}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection !== "projets" && activeSection !== "clients" && (
            <div className="rounded-lg border border-white/10 bg-black/35 p-8 backdrop-blur-sm">
              <h2 className="text-xl font-semibold">
                {activeSection === "plans" ? "Liste de plan" : "Facturation"}
              </h2>
              <p className="mt-2 text-zinc-300">Section en construction.</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-black/90 p-6 text-white shadow-2xl">
            <h2 className="mb-5 text-xl font-semibold">Nouveau projet</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-zinc-200">
                  Client
                </label>
                <input
                  list="clients-list-new-project"
                  placeholder="Commencez à taper le nom du client"
                  className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/30"
                  value={newProject.client}
                  onChange={(e) =>
                    setNewProject({ ...newProject, client: e.target.value })
                  }
                />
                <datalist id="clients-list-new-project">
                  {clients.map((client) => (
                    <option key={client.id} value={client.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-200">
                  Ville
                </label>
                <input
                  placeholder="Ville du projet"
                  className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/30"
                  value={newProject.ville}
                  onChange={(e) =>
                    setNewProject({ ...newProject, ville: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-200">
                  Description
                </label>
                <input
                  placeholder="Description du projet"
                  className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/30"
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      description: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={addProject}
                className="rounded-lg bg-white px-4 py-3 font-medium text-black transition hover:bg-zinc-200"
              >
                Ajouter
              </button>

              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white transition hover:bg-white/10"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}