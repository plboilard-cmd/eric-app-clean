"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
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
const NEXT_INVOICE_KEY = "eric-next-invoice-number-26";

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

type PlanAttachment = {
  id: string;
  name: string;
  url: string;
  pathname: string;
  uploadedAt: string;
};

type PlanRequest = {
  id: string;
  planNumber: number;
  revisionNumber: number;
  code: string;
  descriptionPlan: string;
  statut: string;
  planRequisLe: string;
  ville: string;
  tronconType: string;
  tronconNom: string;
  natureTravaux: string;
  limiteVitesse: string;
  direction: string;
  dureeTravaux: string;
  referenceType: string;
  referenceValue: string;
  fermeture: string;
  zoneTravaux: string;
  detours: string;
  notes: string;
  materielPdf: PlanAttachment | null;
  supplementairePdf: PlanAttachment | null;
  dessinateurPdf: PlanAttachment | null;
  documents: PlanAttachment[];
  dateChantier: string;
  dateCommande: string;
  dateEnvoye: string;
  aujourdHui: boolean;
  complete: boolean;
  dessinateurIngenieur: string;
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

type BillingMonthLine = {
  lineId: string;
  quantity: number;
};

type GeneratedInvoice = {
  id: string;
  invoiceNumber: string;
  monthId: string;
  name: string;
  url: string;
  pathname: string;
  uploadedAt: string;
};

type BillingMonth = {
  id: string;
  month: number;
  year: number;
  label: string;
  lines: BillingMonthLine[];
  invoice?: GeneratedInvoice | null;
};

type BillingBoard = {
  quoteId: string;
  months: BillingMonth[];
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
  planRequests: PlanRequest[];
  soumissions: Quote[];
  billingBoards: BillingBoard[];
  createdAt: string;
};

type ActiveSection = "projets" | "plans" | "clients" | "facturation";
type ViewMode = "list" | "project";
type ProjectPanel = "fiche" | "soumission" | "demandePlan" | "planDetail" | "facturation";

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
const PLAN_STATUSES = [
  "commandé",
  "en dessin",
  "a vérifier",
  "a corriger",
  "envoyé",
  "a réviser",
  "révisé",
  "en révision",
];
const TRONCON_TYPES = [
  "",
  "Rue",
  "Avenue",
  "Boulevard",
  "Autoroute",
  "Chemin",
  "Route",
  "Côte",
  "Promenade",
  "Place",
  "Rang",
  "Bretelle",
  "Montée",
  "Terrasse",
];
const DIRECTIONS = ["", "Nord", "Sud", "Est", "Ouest"];
const REFERENCE_TYPES = ["", "Site", "Phase", "Forage", "Ponceaux", "Travaux", "Plan"];
const DEFAULT_FERMETURES = [
  "Fermeture en alternance avec barrières de contrôle",
  "Fermeture en alternance avec signaleurs",
  "Fermeture en alternance avec feux de circulation",
  "Fermeture complète avec contresens",
  "Fermeture complète avec circulation locale seulement",
  "Fermeture complète avec détour",
  "Fermeture de voie de droite",
  "Fermeture de voie de gauche",
  "Fermeture des voies de droites",
  "Fermeture des voies de gauches",
  "Fermeture d'accotement de droite",
  "Fermeture d'accotement de gauche",
  "Fermeture de voie de virage",
];
const DESSINATEURS_PLAN = ["", "Pierre-Luc", "Véronique", "Audrey"];

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
  planRequests: [],
  soumissions: [],
  billingBoards: [],
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

function makeInvoiceNumber(nextNumber: number) {
  return `F-${YEAR_PREFIX}-${String(nextNumber).padStart(4, "0")}`;
}

function getMonthLabel(month: number, year: number) {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("fr-CA", { month: "long", year: "numeric" });
}

function getMonthYearFromDate(dateString: string) {
  const date = dateString ? new Date(dateString) : new Date();
  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }
  return { month: date.getMonth() + 1, year: date.getFullYear() };
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
    planRequests:
      raw.planRequests?.map((plan) => ({
        id: plan.id ?? crypto.randomUUID(),
        planNumber: Number(plan.planNumber) || 1,
        revisionNumber: Number(plan.revisionNumber) || 0,
        code:
          plan.code ??
          makePlanCode(
            raw.numeroProjet ?? makeProjectNumber(index + 1),
            Number(plan.planNumber) || 1,
            Number(plan.revisionNumber) || 0
          ),
        descriptionPlan: plan.descriptionPlan ?? raw.description ?? "",
        statut: plan.statut ?? "",
        planRequisLe: plan.planRequisLe ?? "",
        ville: plan.ville ?? raw.ville ?? "",
        tronconType: plan.tronconType ?? "",
        tronconNom: plan.tronconNom ?? "",
        natureTravaux: plan.natureTravaux ?? "",
        limiteVitesse: plan.limiteVitesse ?? "",
        direction: plan.direction ?? "",
        dureeTravaux: plan.dureeTravaux ?? "",
        referenceType: plan.referenceType ?? "",
        referenceValue: plan.referenceValue ?? "",
        fermeture: plan.fermeture ?? "",
        zoneTravaux: plan.zoneTravaux ?? "",
        detours: plan.detours ?? "",
        notes: plan.notes ?? "",
        materielPdf: plan.materielPdf ?? null,
        supplementairePdf: plan.supplementairePdf ?? null,
        dessinateurPdf: plan.dessinateurPdf ?? null,
        documents: plan.documents ?? [],
        dateChantier: plan.dateChantier ?? "",
        dateCommande: plan.dateCommande ?? "",
        dateEnvoye: plan.dateEnvoye ?? "",
        aujourdHui: Boolean(plan.aujourdHui),
        complete: Boolean(plan.complete),
        dessinateurIngenieur: plan.dessinateurIngenieur ?? raw.charge ?? "",
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
    billingBoards: raw.billingBoards ?? [],
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

function makePlanCode(projectNumber: string, planNumber: number, revisionNumber: number) {
  return `${projectNumber}_P${String(planNumber).padStart(3, "0")}_V${String(revisionNumber).padStart(2, "0")}`;
}

function todayFrCa() {
  return new Date().toISOString().slice(0, 10);
}

function createPlanRequest(project: Project, planNumber: number, revisionNumber: number, base?: Partial<PlanRequest>): PlanRequest {
  const code = makePlanCode(project.numeroProjet, planNumber, revisionNumber);

  return {
    id: crypto.randomUUID(),
    planNumber,
    revisionNumber,
    code,
    descriptionPlan: base?.descriptionPlan ?? project.description ?? "",
    statut: base?.statut ?? "",
    planRequisLe: base?.planRequisLe ?? "",
    ville: base?.ville ?? project.ville ?? "",
    tronconType: base?.tronconType ?? "",
    tronconNom: base?.tronconNom ?? "",
    natureTravaux: base?.natureTravaux ?? "",
    limiteVitesse: base?.limiteVitesse ?? "",
    direction: base?.direction ?? "",
    dureeTravaux: base?.dureeTravaux ?? "",
    referenceType: base?.referenceType ?? "",
    referenceValue: base?.referenceValue ?? "",
    fermeture: base?.fermeture ?? "",
    zoneTravaux: base?.zoneTravaux ?? "",
    detours: base?.detours ?? "",
    notes: base?.notes ?? "",
    materielPdf: base?.materielPdf ?? null,
    supplementairePdf: base?.supplementairePdf ?? null,
    dessinateurPdf: base?.dessinateurPdf ?? null,
    documents: base?.documents ?? [],
    dateChantier: base?.dateChantier ?? "",
    dateCommande: base?.dateCommande ?? todayFrCa(),
    dateEnvoye: base?.dateEnvoye ?? "",
    aujourdHui: base?.aujourdHui ?? false,
    complete: base?.complete ?? false,
    dessinateurIngenieur: base?.dessinateurIngenieur ?? project.charge ?? "",
  };
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

async function loadImageDataUrl(src: string): Promise<string | null> {
  try {
    const response = await fetch(src);
    const blob = await response.blob();

    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function Home() {
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

  const [planSearchNumber, setPlanSearchNumber] = useState("");
  const [planSearchVille, setPlanSearchVille] = useState("");
  const [planSearchClient, setPlanSearchClient] = useState("");
  const [planSearchDescription, setPlanSearchDescription] = useState("");
  const [planSearchDessinateur, setPlanSearchDessinateur] = useState("");
  const [showSentPlans, setShowSentPlans] = useState(false);

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
  const [selectedPlan, setSelectedPlan] = useState<PlanRequest | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [newFermetureOption, setNewFermetureOption] = useState("");
  const [fermetureOptions, setFermetureOptions] = useState<string[]>(DEFAULT_FERMETURES);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingInvoicePdf, setIsGeneratingInvoicePdf] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [invoicePdfError, setInvoicePdfError] = useState("");
  const [newBillingMonth, setNewBillingMonth] = useState(String(new Date().getMonth() + 1));
  const [newBillingYear, setNewBillingYear] = useState(String(new Date().getFullYear()));

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

    if (!localStorage.getItem(NEXT_INVOICE_KEY)) {
      localStorage.setItem(NEXT_INVOICE_KEY, "500");
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

  const planListing = useMemo(() => {
    return projects
      .flatMap((project) =>
        project.planRequests.map((plan) => ({
          project,
          plan,
        }))
      )
      .filter(({ project, plan }) => {
        if (!plan.statut) return false;
        if (plan.statut === "envoyé" && !showSentPlans) return false;

        const fullPlanNumber = `${plan.code} ${project.numeroProjet} P${String(plan.planNumber).padStart(3, "0")} V${String(plan.revisionNumber).padStart(2, "0")}`.toLowerCase();

        const numberOk = fullPlanNumber.includes(planSearchNumber.toLowerCase().trim());
        const villeOk = (plan.ville || project.ville || "")
          .toLowerCase()
          .includes(planSearchVille.toLowerCase().trim());
        const clientOk = project.client
          .toLowerCase()
          .includes(planSearchClient.toLowerCase().trim());
        const descriptionOk = (plan.descriptionPlan || "")
          .toLowerCase()
          .includes(planSearchDescription.toLowerCase().trim());
        const dessinateurOk = (plan.dessinateurIngenieur || "")
          .toLowerCase()
          .includes(planSearchDessinateur.toLowerCase().trim());

        return numberOk && villeOk && clientOk && descriptionOk && dessinateurOk;
      })
      .sort((a, b) => {
        const dateA = a.plan.planRequisLe || "9999-12-31";
        const dateB = b.plan.planRequisLe || "9999-12-31";
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        if (a.project.numeroProjet !== b.project.numeroProjet) {
          return b.project.numeroProjet.localeCompare(a.project.numeroProjet);
        }
        if (a.plan.planNumber !== b.plan.planNumber) {
          return b.plan.planNumber - a.plan.planNumber;
        }
        return b.plan.revisionNumber - a.plan.revisionNumber;
      });
  }, [
    projects,
    showSentPlans,
    planSearchNumber,
    planSearchVille,
    planSearchClient,
    planSearchDescription,
    planSearchDessinateur,
  ]);

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

  const activePlan = projectForm.planRequests.find((plan) => plan.id === activePlanId) ?? null;
  const activeBillingQuote = projectForm.soumissions.find((quote) => quote.status === "Actif") ?? projectForm.soumissions[0] ?? null;
  const activeBillingBoard = activeBillingQuote
    ? projectForm.billingBoards.find((board) => board.quoteId === activeBillingQuote.id) ?? null
    : null;

  const activeBillingMonths = useMemo(() => {
    return [...(activeBillingBoard?.months ?? [])]
      .sort((a, b) => (b.year === a.year ? b.month - a.month : b.year - a.year))
      .slice(0, 3);
  }, [activeBillingBoard]);

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
      planRequests: [],
      soumissions: [],
      billingBoards: [],
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
    setSelectedPlan(null);
    setActivePlanId(null);
    setUploadError("");
    setPdfError("");
    setViewMode("project");
  };

  const openProjectPlanDetail = (project: Project, plan: PlanRequest) => {
    setSelectedProjectId(project.id);
    setProjectForm(project);
    setProjectPanel("planDetail");
    setActivePlanId(plan.id);
    setSelectedPlan(plan);
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

  const createPlanDemand = () => {
    const nextPlanNumber =
      projectForm.planRequests.reduce(
        (max, plan) => Math.max(max, plan.planNumber),
        0
      ) + 1;

    const plan = createPlanRequest(projectForm, nextPlanNumber, 0);

    persistProjectForm({
      ...projectForm,
      planRequests: [...projectForm.planRequests, plan],
    });
  };

  const copyPlanAsNewPlan = (sourcePlan: PlanRequest) => {
    const nextPlanNumber =
      projectForm.planRequests.reduce(
        (max, plan) => Math.max(max, plan.planNumber),
        0
      ) + 1;

    const plan = createPlanRequest(projectForm, nextPlanNumber, 0, sourcePlan);

    persistProjectForm({
      ...projectForm,
      planRequests: [...projectForm.planRequests, plan],
    });
  };

  const copyPlanAsRevision = (sourcePlan: PlanRequest) => {
    const nextRevisionNumber =
      projectForm.planRequests
        .filter((plan) => plan.planNumber === sourcePlan.planNumber)
        .reduce((max, plan) => Math.max(max, plan.revisionNumber), -1) + 1;

    const plan = createPlanRequest(
      projectForm,
      sourcePlan.planNumber,
      nextRevisionNumber,
      sourcePlan
    );

    persistProjectForm({
      ...projectForm,
      planRequests: [...projectForm.planRequests, plan],
    });
  };

  const updatePlanRequest = (planId: string, patch: Partial<PlanRequest>) => {
    persistProjectForm({
      ...projectForm,
      planRequests: projectForm.planRequests.map((plan) =>
        plan.id === planId ? { ...plan, ...patch } : plan
      ),
    });
  };

  const openPlanDemand = (plan: PlanRequest) => {
    setActivePlanId(plan.id);
    setProjectPanel("planDetail");
  };

  const updateActivePlan = (patch: Partial<PlanRequest>) => {
    if (!activePlan) return;
    updatePlanRequest(activePlan.id, patch);
  };

  const generatePlanFileName = (plan: PlanRequest) => {
    const troncon = `${plan.tronconType} ${plan.tronconNom}`.trim();
    const reference = `${plan.referenceType} ${plan.referenceValue}`.trim();
    const rawParts = [
      plan.code,
      plan.ville,
      troncon,
      plan.direction,
      plan.fermeture,
      reference,
    ];

    return rawParts
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) =>
        part
          .replaceAll("/", "")
          .replaceAll(String.fromCharCode(92), "")
          .replaceAll(":", "")
          .replaceAll("*", "")
          .replaceAll("?", "")
          .replaceAll('"', "")
          .replaceAll("<", "")
          .replaceAll(">", "")
          .replaceAll("|", "")
          .replaceAll(" ", "_")
      )
      .join("_");
  };

  const addFermetureOption = () => {
    const value = newFermetureOption.trim();
    if (!value) return;
    if (!fermetureOptions.includes(value)) {
      setFermetureOptions([...fermetureOptions, value]);
    }
    if (activePlan) updateActivePlan({ fermeture: value });
    setNewFermetureOption("");
  };

  const uploadPlanAttachment = async (
    e: ChangeEvent<HTMLInputElement>,
    field: "materielPdf" | "supplementairePdf" | "dessinateurPdf"
  ) => {
    const file = e.target.files?.[0];
    if (!file || !activePlan) return;

    try {
      const data = await uploadPdfBlob(file);
      const attachment: PlanAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        url: data.url,
        pathname: data.pathname,
        uploadedAt: new Date().toISOString(),
      };
      updateActivePlan({ [field]: attachment } as Partial<PlanRequest>);
    } catch (err) {
      console.error(err);
      alert("Impossible de téléverser le PDF.");
    } finally {
      e.target.value = "";
    }
  };

  const removePlanAttachment = (
    field: "materielPdf" | "supplementairePdf" | "dessinateurPdf"
  ) => {
    updateActivePlan({ [field]: null } as Partial<PlanRequest>);
  };

  const uploadPlanDocument = async (
    e: ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const file = e.target.files?.[0];
    if (!file || !activePlan) return;

    try {
      const data = await uploadPdfBlob(file);
      const attachment: PlanAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        url: data.url,
        pathname: data.pathname,
        uploadedAt: new Date().toISOString(),
      };
      const docs = [...activePlan.documents];
      docs[index] = attachment;
      updateActivePlan({ documents: docs.filter(Boolean) });
    } catch (err) {
      console.error(err);
      alert("Impossible de téléverser le PDF.");
    } finally {
      e.target.value = "";
    }
  };

  const removePlanDocument = (index: number) => {
    if (!activePlan) return;
    const docs = [...activePlan.documents];
    docs.splice(index, 1);
    updateActivePlan({ documents: docs });
  };

  const sendPlanToListing = (plan: PlanRequest) => {
    updatePlanRequest(plan.id, {
      statut: "commandé",
      dateEnvoye: todayFrCa(),
    });
    alert(`La demande ${plan.code} sera envoyée à la liste de plan à la prochaine étape.`);
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

    const { month, year } = getMonthYearFromDate(quote.date);
    const billingBoard: BillingBoard = {
      quoteId: quote.id,
      months: [
        {
          id: crypto.randomUUID(),
          month,
          year,
          label: getMonthLabel(month, year),
          lines: [],
          invoice: null,
        },
      ],
    };

    const updatedProject = {
      ...projectForm,
      soumissions: [...projectForm.soumissions, quote],
      billingBoards: [...projectForm.billingBoards, billingBoard],
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
    if (!activeQuote) return;

    setPdfError("");
    setIsGeneratingPdf(true);

    try {
      const pdf = new jsPDF("p", "mm", "letter");
      const logo = await loadImageDataUrl("/logo-dynamique.png");

      const margin = 15;
      let y = 15;

      if (logo) {
        pdf.addImage(logo, "PNG", margin, y - 2, 50, 18);
      } else {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text("DYNAMIQUE", margin, y + 2);
        pdf.setFontSize(10);
        pdf.text("EXPERT-CONSEIL", margin, y + 9);
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.setTextColor(255, 102, 0);
      pdf.text("SOUMISSION", 200, y, { align: "right" });

      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      pdf.text(activeQuote.name, 200, y + 7, { align: "right" });

      y += 28;

      pdf.setDrawColor(220);
      pdf.line(margin, y, 200, y);
      y += 10;

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("PRÉSENTÉ À", margin, y);
      pdf.text("PRÉPARÉ PAR", 200, y, { align: "right" });

      y += 8;

      pdf.setFont("helvetica", "normal");
      pdf.text(`Entreprise : ${projectForm.client || ""}`, margin, y);
      pdf.text(`Contact : ${preparedBy.name}`, 200, y, { align: "right" });

      y += 6;
      pdf.text(`Contact : ${selectedContact?.name || ""}`, margin, y);
      pdf.text(`No. Tel. : ${preparedBy.phone}`, 200, y, { align: "right" });

      y += 6;
      pdf.text(`Courriel : ${selectedContact?.email || ""}`, margin, y);
      pdf.text(`Date : ${formatDisplayDate(activeQuote.date)}`, 200, y, {
        align: "right",
      });

      y += 6;
      pdf.text(`No. Tel. : ${selectedContact?.phone || ""}`, margin, y);

      y += 16;

      pdf.setFont("helvetica", "bold");
      pdf.text("DESCRIPTION DU PROJET", margin, y);
      y += 8;

      pdf.setFont("helvetica", "normal");
      const description = projectForm.numeroClient
        ? `${projectForm.numeroClient} | ${projectForm.description || ""}`
        : projectForm.description || "";
      const descriptionLines = pdf.splitTextToSize(description, 180);
      pdf.text(descriptionLines, margin, y);
      y += descriptionLines.length * 6 + 10;

      pdf.setFont("helvetica", "bold");
      pdf.setFillColor(230, 230, 230);
      pdf.rect(margin, y, 180, 8, "F");
      pdf.text("ITEM", margin + 2, y + 5.5);
      pdf.text("PRIX", 122, y + 5.5);
      pdf.text("QUANTITÉ", 145, y + 5.5);
      pdf.text("TOTAL", 175, y + 5.5);

      y += 8;

      pdf.setFont("helvetica", "normal");

      if (activeQuote.lines.length === 0) {
        pdf.rect(margin, y, 180, 10);
        pdf.text("Aucun item ajouté.", margin + 2, y + 6);
        y += 10;
      } else {
        activeQuote.lines.forEach((line) => {
          const itemLines = pdf.splitTextToSize(line.name, 100);
          const rowHeight = Math.max(9, itemLines.length * 5 + 3);

          pdf.rect(margin, y, 180, rowHeight);
          pdf.text(itemLines, margin + 2, y + 6);
          pdf.text(money(line.price), 122, y + 6);
          pdf.text(String(line.quantity), 150, y + 6);
          pdf.text(money(line.price * line.quantity), 175, y + 6);
          y += rowHeight;
        });
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, y, 180, 9, "F");
      pdf.text("TOTAL", 145, y + 6);
      pdf.text(money(quoteTotal), 175, y + 6);
      y += 18;

      pdf.setFont("helvetica", "bold");
      pdf.text("NOTES", margin, y);
      y += 7;

      pdf.setFont("helvetica", "normal");
      const notes = [
        "- Validité: 30 jours;",
        "- Responsabilité: Dynamique Expert-Conseil Inc. décline toute responsabilité liée à l’installation de la signalisation découlant d’un plan. La conformité sur site relève de l'installateur;",
        "- Paiement: Net 30 jours;",
        "- Taxes: TPS et TVQ en sus.",
      ];

      notes.forEach((note) => {
        const lines = pdf.splitTextToSize(note, 180);
        pdf.text(lines, margin, y);
        y += lines.length * 5.5;
      });

      y += 12;

      pdf.text("Approuvé par: __________________________", margin, y);
      pdf.text("Bon de commande: ______________________", 115, y);

      y += 18;

      pdf.setFont("helvetica", "bold");
      pdf.text("Dynamique Expert-Conseil Inc.", margin, y);
      y += 6;
      pdf.setFont("helvetica", "normal");
      pdf.text("44, Allée du refuge", margin, y);
      pdf.text("(819) 678-6066", 145, y);
      y += 6;
      pdf.text("Magog, Qc", margin, y);
      pdf.text("info@dynamiqueexpert.ca", 145, y);
      y += 6;
      pdf.text("J1X 8B5", margin, y);
      pdf.text("www.dynamiqueexpert.ca", 145, y);

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

  const ensureBillingBoard = () => {
    if (!activeBillingQuote) return null;

    const existing = projectForm.billingBoards.find(
      (board) => board.quoteId === activeBillingQuote.id
    );

    if (existing) return existing;

    const { month, year } = getMonthYearFromDate(activeBillingQuote.date);
    const newBoard: BillingBoard = {
      quoteId: activeBillingQuote.id,
      months: [
        {
          id: crypto.randomUUID(),
          month,
          year,
          label: getMonthLabel(month, year),
          lines: [],
          invoice: null,
        },
      ],
    };

    persistProjectForm({
      ...projectForm,
      billingBoards: [...projectForm.billingBoards, newBoard],
    });

    return newBoard;
  };

  const updateBillingMonthQuantity = (monthId: string, lineId: string, quantity: number) => {
    if (!activeBillingQuote) return;
    const board = ensureBillingBoard();
    if (!board) return;

    const updatedBoard: BillingBoard = {
      ...board,
      months: board.months.map((month) => {
        if (month.id !== monthId) return month;

        const existingLine = month.lines.find((line) => line.lineId === lineId);
        const updatedLines = existingLine
          ? month.lines.map((line) =>
              line.lineId === lineId ? { ...line, quantity: Math.max(0, quantity) } : line
            )
          : [...month.lines, { lineId, quantity: Math.max(0, quantity) }];

        return { ...month, lines: updatedLines };
      }),
    };

    persistProjectForm({
      ...projectForm,
      billingBoards: projectForm.billingBoards.some((item) => item.quoteId === board.quoteId)
        ? projectForm.billingBoards.map((item) =>
            item.quoteId === board.quoteId ? updatedBoard : item
          )
        : [...projectForm.billingBoards, updatedBoard],
    });
  };

  const addBillingMonth = () => {
    if (!activeBillingQuote) return;
    const board = ensureBillingBoard();
    if (!board) return;

    const month = Number(newBillingMonth);
    const year = Number(newBillingYear);
    if (!month || !year) return;

    const alreadyExists = board.months.some(
      (item) => item.month === month && item.year === year
    );
    if (alreadyExists) return;

    const updatedBoard: BillingBoard = {
      ...board,
      months: [
        ...board.months,
        {
          id: crypto.randomUUID(),
          month,
          year,
          label: getMonthLabel(month, year),
          lines: [],
          invoice: null,
        },
      ].sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year),
    };

    persistProjectForm({
      ...projectForm,
      billingBoards: projectForm.billingBoards.map((item) =>
        item.quoteId === board.quoteId ? updatedBoard : item
      ),
    });
  };

  const getMonthLineQuantity = (month: BillingMonth, lineId: string) => {
    return month.lines.find((line) => line.lineId === lineId)?.quantity ?? 0;
  };

  const getRealQuantityTotal = (lineId: string) => {
    if (!activeBillingBoard) return 0;
    return activeBillingBoard.months.reduce(
      (total, month) => total + getMonthLineQuantity(month, lineId),
      0
    );
  };

  const generateInvoicePdf = async (month: BillingMonth) => {
    if (!activeBillingQuote) return;

    setInvoicePdfError("");
    setIsGeneratingInvoicePdf(true);

    try {
      const nextInvoiceNumber = Number(localStorage.getItem(NEXT_INVOICE_KEY) || "500");
      const invoiceNumber = makeInvoiceNumber(nextInvoiceNumber);
      const pdf = new jsPDF("p", "mm", "letter");
      const logo = await loadImageDataUrl("/logo-dynamique.png");

      const margin = 15;
      let y = 15;

      if (logo) {
        pdf.addImage(logo, "PNG", margin, y - 2, 50, 18);
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.setTextColor(255, 102, 0);
      pdf.text("FACTURE", 200, y, { align: "right" });

      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      pdf.text(invoiceNumber, 200, y + 7, { align: "right" });
      pdf.text(`Date : ${formatDisplayDate(new Date().toISOString())}`, 200, y + 14, { align: "right" });
      pdf.text("NEQ: 1181748436", 200, y + 21, { align: "right" });

      y += 35;
      pdf.setDrawColor(220);
      pdf.line(margin, y, 200, y);
      y += 10;

      pdf.setFont("helvetica", "bold");
      pdf.text("FACTURÉ À", margin, y);
      pdf.text("RÉFÉRENCE", 200, y, { align: "right" });
      y += 8;

      pdf.setFont("helvetica", "normal");
      pdf.text(`Client : ${projectForm.client || ""}`, margin, y);
      pdf.text(`O/S No. : ${activeBillingQuote.name}`, 200, y, { align: "right" });
      y += 6;
      pdf.text(`Contact : ${selectedContact?.name || ""}`, margin, y);
      pdf.text(`No. BC Client : ${projectForm.poNumber || ""}`, 200, y, { align: "right" });
      y += 6;
      pdf.text(`Courriel : ${selectedContact?.email || ""}`, margin, y);
      y += 6;
      pdf.text(`Facturation : ${selectedContact?.email || ""}`, margin, y);
      y += 14;

      pdf.setFont("helvetica", "bold");
      pdf.text("DESCRIPTION DU PROJET", margin, y);
      y += 8;
      pdf.setFont("helvetica", "normal");
      const description = projectForm.numeroClient
        ? `${projectForm.numeroClient} | ${projectForm.description || ""}`
        : projectForm.description || "";
      pdf.text(pdf.splitTextToSize(description, 180), margin, y);
      y += 16;

      pdf.setFont("helvetica", "bold");
      pdf.setFillColor(230, 230, 230);
      pdf.rect(margin, y, 180, 8, "F");
      pdf.text("ITEM", margin + 2, y + 5.5);
      pdf.text("PRIX", 120, y + 5.5);
      pdf.text("QUANTITÉ", 145, y + 5.5);
      pdf.text("TOTAL", 175, y + 5.5);
      y += 8;

      pdf.setFont("helvetica", "normal");
      const invoiceLines = activeBillingQuote.lines
        .map((line) => ({
          ...line,
          invoiceQty: getMonthLineQuantity(month, line.id),
        }))
        .filter((line) => line.invoiceQty > 0);

      let subtotal = 0;
      if (invoiceLines.length === 0) {
        pdf.rect(margin, y, 180, 10);
        pdf.text("Aucun item à facturer pour ce mois.", margin + 2, y + 6);
        y += 10;
      } else {
        invoiceLines.forEach((line) => {
          const total = line.price * line.invoiceQty;
          subtotal += total;
          const itemLines = pdf.splitTextToSize(line.name, 100);
          const rowHeight = Math.max(9, itemLines.length * 5 + 3);
          pdf.rect(margin, y, 180, rowHeight);
          pdf.text(itemLines, margin + 2, y + 6);
          pdf.text(money(line.price), 120, y + 6);
          pdf.text(String(line.invoiceQty), 150, y + 6);
          pdf.text(money(total), 175, y + 6);
          y += rowHeight;
        });
      }

      const tps = subtotal * 0.05;
      const tvq = subtotal * 0.09975;
      const total = subtotal + tps + tvq;

      y += 6;
      pdf.setFont("helvetica", "bold");
      pdf.text(`Sous-total : ${money(subtotal)}`, 200, y, { align: "right" });
      y += 6;
      pdf.text(`(74091 4239 RT 0001) T.P.S. 5% : ${money(tps)}`, 200, y, { align: "right" });
      y += 6;
      pdf.text(`(12 3349 7637 TQ 0001) T.V.Q. 9.975% : ${money(tvq)}`, 200, y, { align: "right" });
      y += 8;
      pdf.setFontSize(13);
      pdf.text(`TOTAL : ${money(total)}`, 200, y, { align: "right" });
      y += 16;

      pdf.setFontSize(10);
      pdf.text("NOTES", margin, y);
      y += 7;
      pdf.setFont("helvetica", "normal");
      const invoiceNotes = [
        "- Paiement : Net 30 jours;",
        "- Virement Interac : admin@dynamiqueexpert.ca | Réponse: 6066 | Note (Obligatoire) : S.V.P. inscrire le numéro de facture dans le champ Message au destinataire du virement.",
        "- Dépôt direct : Caisse Desjardins | Transit: 50066 | Institution: 815 | Compte: 7508443 | Note : Veuillez S.V.P. acheminer votre avis de dépôt à admin@dynamiqueexpert.ca",
      ];
      invoiceNotes.forEach((note) => {
        const lines = pdf.splitTextToSize(note, 180);
        pdf.text(lines, margin, y);
        y += lines.length * 5.5;
      });

      y = Math.max(y + 12, 245);
      pdf.setFont("helvetica", "bold");
      pdf.text("Dynamique Expert-Conseil Inc.", margin, y);
      y += 6;
      pdf.setFont("helvetica", "normal");
      pdf.text("44, Allée du refuge", margin, y);
      pdf.text("(819) 678-6066", 145, y);
      y += 6;
      pdf.text("Magog, Qc", margin, y);
      pdf.text("info@dynamiqueexpert.ca", 145, y);
      y += 6;
      pdf.text("J1X 8B5", margin, y);
      pdf.text("www.dynamiqueexpert.ca", 145, y);

      const fileName = `${invoiceNumber}_${projectForm.numeroProjet}_${month.label.replaceAll(" ", "_")}.pdf`;
      const pdfBlob = pdf.output("blob");
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });
      const data = await uploadPdfBlob(file);

      const generatedInvoice: GeneratedInvoice = {
        id: crypto.randomUUID(),
        invoiceNumber,
        monthId: month.id,
        name: fileName,
        url: data.url,
        pathname: data.pathname,
        uploadedAt: new Date().toISOString(),
      };

      const board = ensureBillingBoard();
      if (!board) return;

      const updatedBoard: BillingBoard = {
        ...board,
        months: board.months.map((item) =>
          item.id === month.id ? { ...item, invoice: generatedInvoice } : item
        ),
      };

      persistProjectForm({
        ...projectForm,
        billingBoards: projectForm.billingBoards.map((item) =>
          item.quoteId === board.quoteId ? updatedBoard : item
        ),
      });

      localStorage.setItem(NEXT_INVOICE_KEY, String(nextInvoiceNumber + 1));
    } catch (err) {
      console.error(err);
      setInvoicePdfError("Impossible de générer la facture PDF.");
    } finally {
      setIsGeneratingInvoicePdf(false);
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

            <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-4">
              <button
                onClick={() => setProjectPanel("fiche")}
                className={`min-h-[90px] rounded-xl border-2 border-orange-400 px-4 text-2xl font-semibold transition ${
                  projectPanel === "fiche"
                    ? "bg-orange-500 text-black"
                    : "bg-transparent text-orange-400 hover:bg-orange-400/10"
                }`}
              >
                Projet
              </button>

              <button
                onClick={() => setProjectPanel("soumission")}
                className={`min-h-[90px] rounded-xl border-2 border-orange-400 px-4 text-2xl font-semibold transition ${
                  projectPanel === "soumission"
                    ? "bg-orange-500 text-black"
                    : "bg-transparent text-orange-400 hover:bg-orange-400/10"
                }`}
              >
                Estimation
              </button>

              <button
                onClick={() => setProjectPanel("demandePlan")}
                className={`min-h-[90px] rounded-xl border-2 border-orange-400 px-4 text-2xl font-semibold transition ${
                  projectPanel === "demandePlan"
                    ? "bg-orange-500 text-black"
                    : "bg-transparent text-orange-400 hover:bg-orange-400/10"
                }`}
              >
                Demande de plan
              </button>

              <button
                onClick={() => setProjectPanel("facturation")}
                className={`min-h-[90px] rounded-xl border-2 border-orange-400 px-4 text-2xl font-semibold transition ${
                  projectPanel === "facturation"
                    ? "bg-orange-500 text-black"
                    : "bg-transparent text-orange-400 hover:bg-orange-400/10"
                }`}
              >
                Facturation
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
                          {isGeneratingPdf ? "Génération..." : "Générer PDF"}
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
                          <span className="text-sm text-red-400">{pdfError}</span>
                        )}
                      </div>

                      <div className="mx-auto w-full max-w-[850px] rounded bg-white p-10 text-black">
                        <div className="mb-8 flex items-start justify-between">
                          <img
                            src="/logo-dynamique.png"
                            alt="Dynamique Expert-Conseil"
                            className="h-16 w-auto object-contain"
                          />

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
                            <p className="mb-2 font-bold uppercase">Présenté à</p>
                            <p>
                              <strong>Entreprise :</strong> {projectForm.client}
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

                          <div className="text-right">
                            <p className="mb-2 font-bold uppercase">Préparé par</p>
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
                          <p className="mb-2 font-bold uppercase">
                            Description du projet
                          </p>
                          <p>
                            {projectForm.numeroClient
                              ? `${projectForm.numeroClient} | `
                              : ""}
                            {projectForm.description}
                          </p>
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
                                  className="text-red-600"
                                >
                                  X
                                </button>
                              </div>
                            ))
                          )}

                          <div className="grid grid-cols-[1.8fr_0.6fr_0.5fr_0.6fr_0.2fr] border-t border-zinc-400 bg-zinc-100 p-2 text-sm font-bold">
                            <div></div>
                            <div></div>
                            <div>TOTAL</div>
                            <div>{money(quoteTotal)}</div>
                            <div></div>
                          </div>
                        </div>

                        <div className="mt-8 text-sm">
                          <p className="mb-2 font-bold uppercase">Notes</p>
                          <p>- Validité: 30 jours;</p>
                          <p>
                            - Responsabilité: Dynamique Expert-Conseil Inc.
                            décline toute responsabilité liée à l’installation de
                            la signalisation découlant d’un plan. La conformité
                            sur site relève de l'installateur;
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

                        <div className="mt-10 grid grid-cols-2 text-sm">
                          <div>
                            <p className="font-semibold">
                              Dynamique Expert-Conseil Inc.
                            </p>
                            <p>44, Allée du refuge</p>
                            <p>Magog, Qc</p>
                            <p>J1X 8B5</p>
                          </div>
                          <div className="text-right">
                            <p>(819) 678-6066</p>
                            <p>info@dynamiqueexpert.ca</p>
                            <p>www.dynamiqueexpert.ca</p>
                          </div>
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
            ) : projectPanel === "facturation" ? (
              <div className="rounded-2xl border border-white/10 bg-black/35 p-5 shadow-2xl backdrop-blur-sm">
                <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-orange-400">Bordereau de facturation</h2>
                    <p className="mt-1 text-sm text-zinc-300">
                      Les items proviennent de la soumission active du projet.
                    </p>
                  </div>

                  {activeBillingQuote && (
                    <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
                      Soumission active : <span className="font-semibold text-white">{activeBillingQuote.name}</span>
                    </div>
                  )}
                </div>

                {!activeBillingQuote ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-zinc-300">
                    Aucune soumission disponible. Crée une soumission active avant de facturer.
                  </div>
                ) : (
                  <>
                    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-orange-400/30 bg-black/20 p-4">
                      <div>
                        <label className="mb-2 block text-sm text-zinc-200">Mois</label>
                        <select
                          value={newBillingMonth}
                          onChange={(e) => setNewBillingMonth(e.target.value)}
                          className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
                        >
                          {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                            <option key={month} value={month} className="text-black">
                              {getMonthLabel(month, 2026).split(" ")[0]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-zinc-200">Année</label>
                        <input
                          value={newBillingYear}
                          onChange={(e) => setNewBillingYear(e.target.value)}
                          className="w-28 rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
                        />
                      </div>

                      <button
                        onClick={addBillingMonth}
                        className="rounded-lg bg-orange-500 px-4 py-3 font-medium text-black transition hover:bg-orange-400"
                      >
                        + Ajouter un mois
                      </button>

                      {invoicePdfError && <span className="text-sm text-red-400">{invoicePdfError}</span>}
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-white/10">
                      <table className="min-w-[1400px] w-full text-sm">
                        <thead className="bg-orange-500 text-black">
                          <tr>
                            <th className="p-3 text-left font-semibold">Ligne</th>
                            <th className="p-3 text-left font-semibold">Description</th>
                            <th className="p-3 text-left font-semibold">Unité</th>
                            <th className="p-3 text-left font-semibold">$ Unitaire</th>
                            <th className="p-3 text-left font-semibold">Qté soumise</th>
                            <th className="p-3 text-left font-semibold">$ Total soumis</th>
                            <th className="p-3 text-left font-semibold">Qté réelle total</th>
                            <th className="p-3 text-left font-semibold">$ Total réel</th>
                            {activeBillingMonths.map((month) => (
                              <th key={month.id} className="p-3 text-left font-semibold">
                                <div>{month.label}</div>
                                <div className="mt-1 text-xs font-normal">Qté réelle / $ total</div>
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {activeBillingQuote.lines.length === 0 ? (
                            <tr>
                              <td colSpan={8 + activeBillingMonths.length} className="p-6 text-center text-zinc-300">
                                Aucun item dans la soumission active.
                              </td>
                            </tr>
                          ) : (
                            activeBillingQuote.lines.map((line, index) => {
                              const realQtyTotal = getRealQuantityTotal(line.id);
                              const realMoneyTotal = realQtyTotal * line.price;
                              return (
                                <tr key={line.id} className="border-t border-white/10 bg-black/15">
                                  <td className="p-3 text-white">{index + 1}</td>
                                  <td className="p-3 text-white">{line.name}</td>
                                  <td className="p-3 text-zinc-200">Unité</td>
                                  <td className="p-3 text-zinc-200">{money(line.price)}</td>
                                  <td className="p-3 text-zinc-200">{line.quantity}</td>
                                  <td className="p-3 text-zinc-200">{money(line.price * line.quantity)}</td>
                                  <td className="p-3 text-zinc-200">{realQtyTotal}</td>
                                  <td className="p-3 text-zinc-200">{money(realMoneyTotal)}</td>
                                  {activeBillingMonths.map((month) => {
                                    const monthQty = getMonthLineQuantity(month, line.id);
                                    return (
                                      <td key={`${month.id}-${line.id}`} className="p-3">
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="number"
                                            min="0"
                                            value={monthQty}
                                            onChange={(e) =>
                                              updateBillingMonthQuantity(month.id, line.id, Number(e.target.value))
                                            }
                                            className="w-20 rounded border border-white/10 bg-white/10 px-2 py-1 text-white outline-none"
                                          />
                                          <span className="text-zinc-200">{money(monthQty * line.price)}</span>
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })
                          )}
                        </tbody>

                        {activeBillingQuote.lines.length > 0 && (
                          <tfoot>
                            <tr className="border-t-2 border-orange-400 bg-black/40 font-semibold">
                              <td colSpan={5} className="p-3 text-right text-white">TOTAL</td>
                              <td className="p-3 text-white">
                                {money(activeBillingQuote.lines.reduce((total, line) => total + line.price * line.quantity, 0))}
                              </td>
                              <td className="p-3 text-white">
                                {activeBillingQuote.lines.reduce((total, line) => total + getRealQuantityTotal(line.id), 0)}
                              </td>
                              <td className="p-3 text-white">
                                {money(activeBillingQuote.lines.reduce((total, line) => total + getRealQuantityTotal(line.id) * line.price, 0))}
                              </td>
                              {activeBillingMonths.map((month) => {
                                const monthTotal = activeBillingQuote.lines.reduce(
                                  (total, line) => total + getMonthLineQuantity(month, line.id) * line.price,
                                  0
                                );
                                return (
                                  <td key={`total-${month.id}`} className="p-3 text-white">
                                    {money(monthTotal)}
                                  </td>
                                );
                              })}
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {activeBillingMonths.map((month) => (
                        <div key={month.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-orange-400">Facture - {month.label}</p>
                              <p className="text-sm text-zinc-300">
                                Total du mois : {money(activeBillingQuote.lines.reduce((total, line) => total + getMonthLineQuantity(month, line.id) * line.price, 0))}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => generateInvoicePdf(month)}
                                disabled={isGeneratingInvoicePdf}
                                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-50"
                              >
                                {isGeneratingInvoicePdf ? "Génération..." : "Générer PDF facture"}
                              </button>

                              {month.invoice && (
                                <a
                                  href={getPrivateBlobOpenUrl(month.invoice.pathname, month.invoice.url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
                                >
                                  Ouvrir {month.invoice.invoiceNumber}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : projectPanel === "demandePlan" ? (
              <div className="rounded-2xl border border-white/10 bg-black/35 p-5 shadow-2xl backdrop-blur-sm">
                <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-orange-400">
                      Demandes de plan
                    </h2>
                    <p className="mt-1 text-sm text-zinc-300">
                      Liste des plans demandés pour le projet {projectForm.numeroProjet}.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={createPlanDemand}
                      className="rounded-lg bg-orange-500 px-4 py-2 font-medium text-black transition hover:bg-orange-400"
                    >
                      + Nouvelle demande de plan
                    </button>

                    <button
                      onClick={() => {
                        if (!selectedPlan) {
                          alert("Sélectionne un plan avant de le copier.");
                          return;
                        }
                        copyPlanAsNewPlan(selectedPlan);
                      }}
                      className="rounded-lg border border-blue-400/60 bg-blue-400/10 px-4 py-2 text-sm font-medium text-blue-200 transition hover:bg-blue-400/20"
                    >
                      Copier en nouveau plan
                    </button>

                    <button
                      onClick={() => {
                        if (!selectedPlan) {
                          alert("Sélectionne un plan avant de créer une version.");
                          return;
                        }
                        copyPlanAsRevision(selectedPlan);
                      }}
                      className="rounded-lg border border-green-400/60 bg-green-400/10 px-4 py-2 text-sm font-medium text-green-200 transition hover:bg-green-400/20"
                    >
                      Copier en nouvelle version
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="min-w-[1000px] w-full text-sm">
                    <thead className="bg-orange-500 text-black">
                      <tr>
                        <th className="p-3 text-left font-semibold">Sélection</th>
                        <th className="p-3 text-left font-semibold">Plan</th>
                        <th className="p-3 text-left font-semibold">Accès</th>
                        <th className="p-3 text-left font-semibold">Statut</th>
                        <th className="p-3 text-left font-semibold">Dessinateur</th>
                      </tr>
                    </thead>

                    <tbody>
                      {projectForm.planRequests.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-zinc-300">
                            Aucune demande de plan pour le moment.
                          </td>
                        </tr>
                      ) : (
                        [...projectForm.planRequests]
                          .sort((a, b) =>
                            a.planNumber === b.planNumber
                              ? b.revisionNumber - a.revisionNumber
                              : b.planNumber - a.planNumber
                          )
                          .map((plan) => (
                            <tr key={plan.id} className="border-t border-white/10 bg-black/15">
                              <td className="p-3 text-center">
                                <input
                                  type="radio"
                                  name="selectedPlan"
                                  checked={selectedPlan?.id === plan.id}
                                  onChange={() => setSelectedPlan(plan)}
                                />
                              </td>

                              <td className="p-3">
                                <input
                                  value={plan.descriptionPlan}
                                  onChange={(e) =>
                                    updatePlanRequest(plan.id, {
                                      descriptionPlan: e.target.value,
                                    })
                                  }
                                  className="w-full min-w-[420px] rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                                />
                                <p className="mt-1 text-xs text-zinc-400">{plan.code}</p>
                              </td>

                              <td className="p-3">
                                <button
                                  onClick={() => openPlanDemand(plan)}
                                  className="rounded border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
                                >
                                  Demande
                                </button>
                              </td>

                              <td className="p-3">
                                <div className="flex flex-wrap gap-2">
                                  <select
                                    value={plan.statut || ""}
                                    onChange={(e) =>
                                      updatePlanRequest(plan.id, {
                                        statut: e.target.value,
                                      })
                                    }
                                    className="rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                                  >
                                    <option value="" className="text-black">--</option>
                                    {["commandé", "en dessin", "a vérifier", "a corriger", "envoyé", "a réviser", "révisé", "en révision"].map((status) => (
                                      <option key={status} value={status} className="text-black">
                                        {status}
                                      </option>
                                    ))}
                                  </select>

                                  <button
                                    onClick={() => {
                                      updatePlanRequest(plan.id, { statut: "commandé" });
                                      alert(`La demande ${plan.code} sera envoyée au listing de plan à la prochaine étape.`);
                                    }}
                                    className="rounded bg-orange-500 px-3 py-2 text-xs font-medium text-black hover:bg-orange-400"
                                  >
                                    Commandé
                                  </button>
                                </div>
                              </td>

                              <td className="p-3">
                                <select
                                  value={plan.dessinateurIngenieur || ""}
                                  onChange={(e) =>
                                    updatePlanRequest(plan.id, {
                                      dessinateurIngenieur: e.target.value,
                                    })
                                  }
                                  className="rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                                >
                                  <option value="" className="text-black">--</option>
                                  <option value="Pierre-Luc" className="text-black">Pierre-Luc</option>
                                  <option value="Véronique" className="text-black">Véronique</option>
                                  <option value="Audrey" className="text-black">Audrey</option>
                                </select>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : projectPanel === "planDetail" && activePlan ? (
              <div className="rounded-2xl border border-white/10 bg-black/35 p-5 shadow-2xl backdrop-blur-sm">
                <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <button
                      onClick={() => setProjectPanel("demandePlan")}
                      className="mb-3 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                    >
                      ← Retour aux demandes
                    </button>
                    <h2 className="text-2xl font-semibold text-orange-400">
                      Demande de plan
                    </h2>
                    <p className="mt-1 text-sm text-zinc-300">
                      {activePlan.code}
                    </p>
                  </div>

                  <div className="rounded-xl border border-orange-400/30 bg-black/20 p-4 text-right">
                    <p className="text-sm text-zinc-300">Nom du fichier plan généré</p>
                    <p className="mt-2 max-w-[700px] break-all text-sm font-semibold text-orange-300">
                      {generatePlanFileName(activePlan)}
                    </p>
                  </div>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-orange-400/40 bg-orange-500/10 p-4">
                    <label className="mb-2 block text-sm font-semibold text-orange-300">Statut de la demande</label>
                    <select
                      value={activePlan.statut || ""}
                      onChange={(e) => updateActivePlan({ statut: e.target.value })}
                      className="w-full rounded border border-orange-400/40 bg-black/40 px-3 py-3 text-lg font-semibold text-white outline-none"
                    >
                      <option value="" className="text-black">--</option>
                      {PLAN_STATUSES.map((status) => (
                        <option key={status} value={status} className="text-black">{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-xl border border-orange-400/40 bg-orange-500/10 p-4">
                    <label className="mb-2 block text-sm font-semibold text-orange-300">Dessinateur</label>
                    <select
                      value={activePlan.dessinateurIngenieur || ""}
                      onChange={(e) => updateActivePlan({ dessinateurIngenieur: e.target.value })}
                      className="w-full rounded border border-orange-400/40 bg-black/40 px-3 py-3 text-lg font-semibold text-white outline-none"
                    >
                      {DESSINATEURS_PLAN.map((name) => (
                        <option key={name || "empty"} value={name} className="text-black">
                          {name || "--"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                    <h3 className="mb-4 text-lg font-semibold text-orange-400">
                      Informations
                    </h3>

                    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">Projet</label>
                        <input
                          value={projectForm.numeroProjet}
                          readOnly
                          className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">Plan</label>
                        <input
                          value={activePlan.planNumber}
                          readOnly
                          className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">Version</label>
                        <input
                          value={activePlan.revisionNumber}
                          readOnly
                          className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="mb-2 block text-sm text-zinc-300">Client</label>
                      <input
                        value={projectForm.client}
                        readOnly
                        className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="mb-2 block text-sm text-zinc-300">Plan requis le</label>
                      <input
                        type="date"
                        value={activePlan.planRequisLe}
                        onChange={(e) => updateActivePlan({ planRequisLe: e.target.value })}
                        className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="mb-2 block text-sm text-zinc-300">Ville</label>
                      <input
                        value={activePlan.ville}
                        onChange={(e) => updateActivePlan({ ville: e.target.value })}
                        className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                      />
                    </div>

                    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-[0.7fr_1.3fr]">
                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">Tronçon</label>
                        <select
                          value={activePlan.tronconType}
                          onChange={(e) => updateActivePlan({ tronconType: e.target.value })}
                          className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                        >
                          {TRONCON_TYPES.map((type) => (
                            <option key={type || "empty"} value={type} className="text-black">
                              {type || "--"}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">Nom du tronçon</label>
                        <input
                          value={activePlan.tronconNom}
                          onChange={(e) => updateActivePlan({ tronconNom: e.target.value })}
                          className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">Limite de vitesse</label>
                        <input
                          value={activePlan.limiteVitesse}
                          onChange={(e) => updateActivePlan({ limiteVitesse: e.target.value })}
                          className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">Direction</label>
                        <select
                          value={activePlan.direction}
                          onChange={(e) => updateActivePlan({ direction: e.target.value })}
                          className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                        >
                          {DIRECTIONS.map((direction) => (
                            <option key={direction || "empty"} value={direction} className="text-black">
                              {direction || "--"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="mb-2 block text-sm text-zinc-300">Nature des travaux</label>
                      <input
                        value={activePlan.natureTravaux}
                        onChange={(e) => updateActivePlan({ natureTravaux: e.target.value })}
                        className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                      />
                    </div>

                    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">Durée des travaux</label>
                        <input
                          value={activePlan.dureeTravaux}
                          onChange={(e) => updateActivePlan({ dureeTravaux: e.target.value })}
                          className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">Référence</label>
                        <select
                          value={activePlan.referenceType}
                          onChange={(e) => updateActivePlan({ referenceType: e.target.value })}
                          className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                        >
                          {REFERENCE_TYPES.map((type) => (
                            <option key={type || "empty"} value={type} className="text-black">
                              {type || "--"}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">No / texte</label>
                        <input
                          value={activePlan.referenceValue}
                          onChange={(e) => updateActivePlan({ referenceValue: e.target.value })}
                          className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="mb-2 block text-sm text-zinc-300">Fermeture</label>
                      <div className="flex gap-2">
                        <select
                          value={activePlan.fermeture}
                          onChange={(e) => updateActivePlan({ fermeture: e.target.value })}
                          className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                        >
                          <option value="" className="text-black">--</option>
                          {fermetureOptions.map((option) => (
                            <option key={option} value={option} className="text-black">
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <input
                          value={newFermetureOption}
                          onChange={(e) => setNewFermetureOption(e.target.value)}
                          placeholder="Ajouter une option de fermeture"
                          className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-zinc-400"
                        />
                        <button
                          onClick={addFermetureOption}
                          className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-black hover:bg-orange-400"
                        >
                          Ajouter
                        </button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="mb-2 block text-sm text-zinc-300">Zone des travaux</label>
                      <textarea
                        value={activePlan.zoneTravaux}
                        onChange={(e) => updateActivePlan({ zoneTravaux: e.target.value })}
                        rows={3}
                        className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="mb-2 block text-sm text-zinc-300">Détour(s)</label>
                      <textarea
                        value={activePlan.detours}
                        onChange={(e) => updateActivePlan({ detours: e.target.value })}
                        rows={3}
                        className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-300">Notes</label>
                      <textarea
                        value={activePlan.notes}
                        onChange={(e) => updateActivePlan({ notes: e.target.value })}
                        rows={6}
                        className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                      <h3 className="mb-4 text-lg font-semibold text-orange-400">Documents reliés</h3>

                      {[
                        ["Liste matériel", "materielPdf", activePlan.materielPdf],
                        ["Document supplémentaire", "supplementairePdf", activePlan.supplementairePdf],
                      ].map(([label, field, attachment]) => (
                        <div key={String(field)} className="mb-4 rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="mb-2 text-sm font-medium text-zinc-200">{String(label)}</p>
                          {attachment ? (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm text-white">{(attachment as PlanAttachment).name}</span>
                              <div className="flex gap-2">
                                <a
                                  href={getPrivateBlobOpenUrl((attachment as PlanAttachment).pathname, (attachment as PlanAttachment).url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
                                >
                                  Ouvrir
                                </a>
                                <label className="cursor-pointer rounded border border-orange-400/50 bg-orange-400/10 px-3 py-1.5 text-xs text-orange-200 hover:bg-orange-400/20">
                                  Écraser
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => uploadPlanAttachment(e, field as "materielPdf" | "supplementairePdf" | "dessinateurPdf")}
                                    className="hidden"
                                  />
                                </label>
                                <button
                                  onClick={() => removePlanAttachment(field as "materielPdf" | "supplementairePdf" | "dessinateurPdf")}
                                  className="rounded border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
                                >
                                  Retirer
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="inline-block cursor-pointer rounded border border-orange-400/50 bg-orange-400/10 px-3 py-2 text-sm text-orange-200 hover:bg-orange-400/20">
                              Importer un PDF
                              <input
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => uploadPlanAttachment(e, field as "materielPdf" | "supplementairePdf" | "dessinateurPdf")}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                      <h3 className="mb-4 text-lg font-semibold text-orange-400">Pour dessinateur</h3>
                      <label className="mb-2 block text-sm text-zinc-300">Nom du fichier plan (AutoCAD)</label>
                      <input
                        value={generatePlanFileName(activePlan)}
                        readOnly
                        className="mb-4 w-full rounded border border-green-500 bg-green-500/10 px-3 py-2 text-green-100 outline-none"
                      />

                      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <p className="mb-2 text-sm font-medium text-zinc-200">Fichier / document pour dessinateur</p>
                        {activePlan.dessinateurPdf ? (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm text-white">{activePlan.dessinateurPdf.name}</span>
                            <div className="flex gap-2">
                              <a
                                href={getPrivateBlobOpenUrl(activePlan.dessinateurPdf.pathname, activePlan.dessinateurPdf.url)}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
                              >
                                Ouvrir
                              </a>
                              <label className="cursor-pointer rounded border border-orange-400/50 bg-orange-400/10 px-3 py-1.5 text-xs text-orange-200 hover:bg-orange-400/20">
                                Écraser
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  onChange={(e) => uploadPlanAttachment(e, "dessinateurPdf")}
                                  className="hidden"
                                />
                              </label>
                              <button
                                onClick={() => removePlanAttachment("dessinateurPdf")}
                                className="rounded border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
                              >
                                Retirer
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="inline-block cursor-pointer rounded border border-orange-400/50 bg-orange-400/10 px-3 py-2 text-sm text-orange-200 hover:bg-orange-400/20">
                            Importer un PDF
                            <input
                              type="file"
                              accept="application/pdf"
                              onChange={(e) => uploadPlanAttachment(e, "dessinateurPdf")}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                      <h3 className="mb-4 text-lg font-semibold text-orange-400">Documents</h3>
                      {[0, 1, 2, 3].map((index) => {
                        const doc = activePlan.documents[index];
                        return (
                          <div key={index} className="mb-3 rounded-lg border border-white/10 bg-black/20 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium text-zinc-200">Document {index + 1}</p>
                              {doc ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm text-white">{doc.name}</span>
                                  <a
                                    href={getPrivateBlobOpenUrl(doc.pathname, doc.url)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
                                  >
                                    Ouvrir
                                  </a>
                                  <label className="cursor-pointer rounded border border-orange-400/50 bg-orange-400/10 px-3 py-1.5 text-xs text-orange-200 hover:bg-orange-400/20">
                                    Écraser
                                    <input
                                      type="file"
                                      accept="application/pdf"
                                      onChange={(e) => uploadPlanDocument(e, index)}
                                      className="hidden"
                                    />
                                  </label>
                                  <button
                                    onClick={() => removePlanDocument(index)}
                                    className="rounded border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
                                  >
                                    Retirer
                                  </button>
                                </div>
                              ) : (
                                <label className="cursor-pointer rounded border border-orange-400/50 bg-orange-400/10 px-3 py-2 text-sm text-orange-200 hover:bg-orange-400/20">
                                  Importer un PDF
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => uploadPlanDocument(e, index)}
                                    className="hidden"
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
              <h1 className="mt-1 text-2xl font-semibold">Liste de projets</h1>
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
              ["projets", "Projets"],
              ["plans", "Liste de plans"],
              ["facturation", "Facturation"],
              ["clients", "Client"],
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
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-[120px]" />
                    <col className="w-[130px]" />
                    <col className="w-[150px]" />
                    <col className="w-[210px]" />
                    <col />
                    <col className="w-[155px]" />
                    <col className="w-[125px]" />
                    <col className="w-[125px]" />
                  </colgroup>
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
                      [...filteredProjects]
                        .sort((a, b) => b.id - a.id)
                        .map((project) => (
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
                          <td className="p-3 text-white"><div className="truncate">{project.client}</div></td>
                          <td className="p-3 text-zinc-200">
                            <div className="line-clamp-2">{project.description}</div>
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

          {activeSection === "plans" && (
            <div className="rounded-xl border border-white/10 bg-black/35 p-6 backdrop-blur-sm">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Liste de plans</h2>
                  <p className="mt-1 text-sm text-zinc-300">
                    Plans commandés classés par date requise.
                  </p>
                </div>

                <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={showSentPlans}
                    onChange={(e) => setShowSentPlans(e.target.checked)}
                  />
                  Voir envoyés
                </label>
              </div>

              <div className="mb-5 grid gap-4 lg:grid-cols-5">
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">
                    No projet / plan
                  </label>
                  <input
                    value={planSearchNumber}
                    onChange={(e) => setPlanSearchNumber(e.target.value)}
                    placeholder="Ex. 26-0001, P001"
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-200">
                    Ville
                  </label>
                  <input
                    value={planSearchVille}
                    onChange={(e) => setPlanSearchVille(e.target.value)}
                    placeholder="Ville"
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-200">
                    Client
                  </label>
                  <input
                    value={planSearchClient}
                    onChange={(e) => setPlanSearchClient(e.target.value)}
                    placeholder="Client"
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-200">
                    Description
                  </label>
                  <input
                    value={planSearchDescription}
                    onChange={(e) => setPlanSearchDescription(e.target.value)}
                    placeholder="Description plan"
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-200">
                    Dessinateur
                  </label>
                  <input
                    value={planSearchDessinateur}
                    onChange={(e) => setPlanSearchDessinateur(e.target.value)}
                    placeholder="Dessinateur"
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-zinc-400"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="min-w-[1320px] w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-[105px]" />
                    <col className="w-[75px]" />
                    <col className="w-[135px]" />
                    <col className="w-[170px]" />
                    <col />
                    <col className="w-[95px]" />
                    <col className="w-[70px]" />
                    <col className="w-[65px]" />
                    <col className="w-[125px]" />
                    <col className="w-[130px]" />
                    <col className="w-[135px]" />
                  </colgroup>
                  <thead className="bg-orange-500 text-black">
                    <tr>
                      <th className="p-3 text-left font-semibold">No Projet</th>
                      <th className="p-3 text-left font-semibold">Fiche</th>
                      <th className="p-3 text-left font-semibold">Ville</th>
                      <th className="p-3 text-left font-semibold">Client</th>
                      <th className="p-3 text-left font-semibold">Description plan</th>
                      <th className="p-3 text-left font-semibold">Demande</th>
                      <th className="p-3 text-left font-semibold"># Plan</th>
                      <th className="p-3 text-left font-semibold"># Ver.</th>
                      <th className="p-3 text-left font-semibold">Plan requis le</th>
                      <th className="p-3 text-left font-semibold">Statut plan</th>
                      <th className="p-3 text-left font-semibold">Dessinateur</th>
                    </tr>
                  </thead>

                  <tbody>
                    {planListing.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-6 text-center text-zinc-300">
                          Aucun plan à afficher.
                        </td>
                      </tr>
                    ) : (
                      planListing.map(({ project, plan }) => (
                        <tr
                          key={`${project.id}-${plan.id}`}
                          className={`border-t border-white/10 ${
                            plan.statut === "envoyé"
                              ? "bg-zinc-600/35"
                              : plan.statut === "commandé"
                                ? "bg-yellow-500/18"
                                : plan.statut === "en dessin"
                                  ? "bg-sky-500/18"
                                  : plan.statut === "a vérifier" || plan.statut === "a corriger"
                                    ? "bg-purple-500/18"
                                    : "bg-black/15"
                          }`}
                        >
                          <td className="p-3 text-white">{project.numeroProjet}</td>
                          <td className="p-3">
                            <button
                              onClick={() => openProject(project)}
                              className="rounded border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
                            >
                              Fiche
                            </button>
                          </td>
                          <td className="p-3 text-zinc-200">{plan.ville || project.ville}</td>
                          <td className="p-3 text-zinc-200">{project.client}</td>
                          <td className="p-3 text-zinc-100">
                            <div className="max-w-[520px] truncate" title={plan.descriptionPlan}>
                              {plan.descriptionPlan}
                            </div>
                            <p className="mt-1 text-xs text-zinc-400">{plan.code}</p>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => openProjectPlanDetail(project, plan)}
                              className="rounded border border-orange-400/60 bg-orange-400/10 px-3 py-1.5 text-xs text-orange-200 hover:bg-orange-400/20"
                            >
                              Demande
                            </button>
                          </td>
                          <td className="p-3 text-zinc-200">{plan.planNumber}</td>
                          <td className="p-3 text-zinc-200">{plan.revisionNumber}</td>
                          <td className="p-3 text-zinc-200">{formatDisplayDate(plan.planRequisLe)}</td>
                          <td className="p-3 text-zinc-200">{plan.statut}</td>
                          <td className="p-3 text-zinc-200">{plan.dessinateurIngenieur}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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

          {activeSection === "facturation" && (
            <div className="rounded-xl border border-white/10 bg-black/35 p-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold">Facturation</h2>
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
