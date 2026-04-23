"use client";

import { useEffect, useState } from "react";

const allowedUsers = [
  { username: "pierre-luc", code: "0580", name: "Pierre-Luc" },
  { username: "veronique", code: "5926", name: "Véronique" },
];

type StatusType =
  | "À soumissionner"
  | "Soumission envoyée"
  | "Exécution"
  | "Perdu"
  | "Terminé";

type Project = {
  id: number;
  client: string;
  description: string;
  statut: StatusType;
  charge: string;
};

type ActiveSection = "projets" | "plans" | "clients" | "facturation";
type ViewMode = "list" | "project";

export default function Home() {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeSection, setActiveSection] =
    useState<ActiveSection>("projets");

  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [newProject, setNewProject] = useState({
    client: "",
    description: "",
    charge: "",
  });

  const [projectForm, setProjectForm] = useState({
    numeroProjet: "",
    client: "",
    contact: "",
    statut: "À soumissionner" as StatusType,
    ville: "",
    endroit: "",
    description: "",
    poNumber: "",
    pdfName: "",
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("eric-user");
    const savedProjects = localStorage.getItem("eric-projects");
    const savedSection = localStorage.getItem("eric-section") as
      | ActiveSection
      | null;

    if (savedUser) {
      setLoggedInUser(savedUser);
    }

    if (savedProjects) {
      setProjects(JSON.parse(savedProjects));
    }

    if (
      savedSection === "projets" ||
      savedSection === "plans" ||
      savedSection === "clients" ||
      savedSection === "facturation"
    ) {
      setActiveSection(savedSection);
    }

    setIsLoaded(true);
  }, []);

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
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
    localStorage.removeItem("eric-projects");
    localStorage.removeItem("eric-section");
    setLoggedInUser(null);
    setUsername("");
    setCode("");
    setError("");
    setProjects([]);
    setActiveSection("projets");
    setViewMode("list");
  };

  const changeSection = (section: ActiveSection) => {
    setActiveSection(section);
    localStorage.setItem("eric-section", section);
  };

  const addProject = () => {
    if (
      !newProject.client.trim() ||
      !newProject.description.trim() ||
      !newProject.charge.trim()
    ) {
      return;
    }

    const newEntry: Project = {
      id: Date.now(),
      client: newProject.client.trim(),
      description: newProject.description.trim(),
      statut: "À soumissionner",
      charge: newProject.charge.trim(),
    };

    const updated = [...projects, newEntry];
    setProjects(updated);
    localStorage.setItem("eric-projects", JSON.stringify(updated));

    setShowModal(false);
    setNewProject({
      client: "",
      description: "",
      charge: "",
    });
  };

  const openProject = (project?: Project) => {
    setProjectForm({
      numeroProjet: "",
      client: project?.client ?? "",
      contact: "",
      statut: project?.statut ?? "À soumissionner",
      ville: "",
      endroit: "",
      description: project?.description ?? "",
      poNumber: "",
      pdfName: "",
    });
    setViewMode("project");
  };

  if (!isLoaded) {
    return null;
  }

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
            className="w-full max-w-md rounded-2xl border border-white/10 bg-black/80 p-8 text-white backdrop-blur-md shadow-2xl"
          >
            <h1 className="mb-2 text-2xl font-semibold">Connexion à ERIC</h1>

            <p className="mb-6 text-sm text-zinc-300">
              Entrez votre identifiant et votre code d’accès pour continuer.
            </p>

            <div className="mb-4 text-left">
              <label className="mb-2 block text-sm text-zinc-200">
                Identifiant
              </label>
              <input
                type="text"
                placeholder="Ex. user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-zinc-400 outline-none focus:border-white/30"
              />
            </div>

            <div className="mb-4 text-left">
              <label className="mb-2 block text-sm text-zinc-200">
                Code d’accès
              </label>
              <input
                type="password"
                placeholder="Entrez votre code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-zinc-400 outline-none focus:border-white/30"
              />
            </div>

            {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-lg bg-white py-3 font-medium text-black transition hover:bg-zinc-200"
            >
              Se connecter
            </button>

            <p className="mt-5 text-xs text-zinc-500">
              Accès réservé aux utilisateurs autorisés
            </p>
          </form>
        </div>
      </main>
    );
  }

  if (viewMode === "project") {
    return (
      <main className="min-h-screen bg-[#e8e8e8] px-8 py-6 text-[#f58426]">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-start gap-5">
              <div className="pt-1">
                <div className="text-5xl font-bold">D</div>
              </div>

              <div>
                <div className="text-2xl font-bold uppercase tracking-wide text-black">
                  Dynamique
                </div>
                <div className="text-lg uppercase tracking-wide text-black">
                  Expert-Conseil
                </div>
              </div>
            </div>

            <button
              onClick={() => setViewMode("list")}
              className="rounded border border-black px-4 py-2 text-sm text-black"
            >
              Retour à la liste
            </button>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <div className="mb-6">
                <label className="mb-2 block text-2xl">
                  Numéro de projet
                </label>
                <input
                  value={projectForm.numeroProjet}
                  onChange={(e) =>
                    setProjectForm({
                      ...projectForm,
                      numeroProjet: e.target.value,
                    })
                  }
                  placeholder="Généré plus tard"
                  className="w-full border-b-2 border-[#f58426] bg-transparent px-2 py-2 text-black outline-none"
                />
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-2xl">Statut</label>
                <select
                  value={projectForm.statut}
                  onChange={(e) =>
                    setProjectForm({
                      ...projectForm,
                      statut: e.target.value as StatusType,
                    })
                  }
                  className="w-full border-b-2 border-[#f58426] bg-transparent px-2 py-2 text-black outline-none"
                >
                  <option value="À soumissionner">À soumissionner</option>
                  <option value="Soumission envoyée">Soumission envoyée</option>
                  <option value="Exécution">Exécution</option>
                  <option value="Perdu">Perdu</option>
                  <option value="Terminé">Terminé</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-2xl">Ville</label>
                <input
                  value={projectForm.ville}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, ville: e.target.value })
                  }
                  className="w-full border-b-2 border-[#f58426] bg-transparent px-2 py-2 text-black outline-none"
                />
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-2xl">Endroit</label>
                <input
                  value={projectForm.endroit}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, endroit: e.target.value })
                  }
                  className="w-full border-b-2 border-[#f58426] bg-transparent px-2 py-2 text-black outline-none"
                />
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-2xl">Description</label>
                <textarea
                  value={projectForm.description}
                  onChange={(e) =>
                    setProjectForm({
                      ...projectForm,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full border-b-2 border-[#f58426] bg-transparent px-2 py-2 text-black outline-none"
                />
              </div>
            </div>

            <div>
              <div className="mb-6">
                <label className="mb-2 block text-2xl">Client</label>
                <div className="flex gap-3">
                  <input
                    value={projectForm.client}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, client: e.target.value })
                    }
                    className="w-full border-b-2 border-[#f58426] bg-transparent px-2 py-2 text-black outline-none"
                  />
                  <button className="rounded border border-[#f58426] px-3 py-2">
                    +
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-2xl">Contact</label>
                <input
                  value={projectForm.contact}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, contact: e.target.value })
                  }
                  className="w-full border-b-2 border-[#f58426] bg-transparent px-2 py-2 text-black outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <button className="min-h-[130px] border-4 border-[#f58426] bg-transparent text-4xl font-semibold text-[#f58426] transition hover:bg-[#f58426]/10">
              Estimation
            </button>

            <button className="min-h-[130px] border-4 border-[#f58426] bg-transparent text-3xl font-semibold text-[#f58426] transition hover:bg-[#f58426]/10">
              Bordereau de facturation
            </button>

            <button className="min-h-[130px] border-4 border-[#f58426] bg-transparent text-4xl font-semibold text-[#f58426] transition hover:bg-[#f58426]/10">
              Plan
            </button>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-2xl">PDF / No de PO</p>
              <div className="rounded border-2 border-dashed border-[#f58426] p-6 text-black">
                Zone pour ajouter un PDF et inscrire un numéro de PO
              </div>
            </div>

            <div className="flex items-end justify-start lg:justify-end">
              <p className="text-2xl text-black">
                Fait par : {loggedInUser}
              </p>
            </div>
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
            <button
              onClick={() => changeSection("projets")}
              className={`min-w-[120px] border-2 px-6 py-3 text-left transition ${
                activeSection === "projets"
                  ? "border-white bg-white text-black"
                  : "border-white/80 bg-black/20 text-white hover:bg-white/10"
              }`}
            >
              Projet
            </button>

            <button
              onClick={() => changeSection("plans")}
              className={`min-w-[120px] border-2 px-6 py-3 text-left transition ${
                activeSection === "plans"
                  ? "border-white bg-white text-black"
                  : "border-white/80 bg-black/20 text-white hover:bg-white/10"
              }`}
            >
              Liste de plan
            </button>

            <button
              onClick={() => changeSection("clients")}
              className={`min-w-[120px] border-2 px-6 py-3 text-left transition ${
                activeSection === "clients"
                  ? "border-white bg-white text-black"
                  : "border-white/80 bg-black/20 text-white hover:bg-white/10"
              }`}
            >
              Client
            </button>

            <button
              onClick={() => changeSection("facturation")}
              className={`min-w-[120px] border-2 px-6 py-3 text-left transition ${
                activeSection === "facturation"
                  ? "border-white bg-white text-black"
                  : "border-white/80 bg-black/20 text-white hover:bg-white/10"
              }`}
            >
              Facturation
            </button>
          </div>

          {activeSection === "projets" && (
            <>
              <div className="overflow-hidden rounded-lg border border-white/10 bg-black/35 shadow-2xl backdrop-blur-sm">
                <table className="w-full text-sm">
                  <thead className="bg-orange-500 text-black">
                    <tr>
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
                    {projects.length === 0 ? (
                      <tr className="border-t border-white/10">
                        <td
                          colSpan={5}
                          className="p-6 text-center text-zinc-300"
                        >
                          Aucun projet pour le moment.
                        </td>
                      </tr>
                    ) : (
                      projects.map((p) => (
                        <tr
                          key={p.id}
                          className="border-t border-white/10 bg-black/15"
                        >
                          <td className="p-3 text-white">{p.client}</td>
                          <td className="p-3 text-zinc-200">
                            {p.description}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                p.statut === "Perdu"
                                  ? "bg-red-600 text-white"
                                  : p.statut === "Terminé"
                                  ? "bg-blue-600 text-white"
                                  : p.statut === "Soumission envoyée"
                                  ? "bg-yellow-500 text-black"
                                  : p.statut === "À soumissionner"
                                  ? "bg-zinc-300 text-black"
                                  : "bg-green-600 text-white"
                              }`}
                            >
                              {p.statut}
                            </span>
                          </td>
                          <td className="p-3 text-zinc-200">{p.charge}</td>
                          <td className="p-3">
                            <button
                              onClick={() => openProject(p)}
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
            <div className="rounded-lg border border-white/10 bg-black/35 p-8 backdrop-blur-sm">
              <h2 className="text-xl font-semibold">Liste de plan</h2>
              <p className="mt-2 text-zinc-300">Section en construction.</p>
            </div>
          )}

          {activeSection === "clients" && (
            <div className="rounded-lg border border-white/10 bg-black/35 p-8 backdrop-blur-sm">
              <h2 className="text-xl font-semibold">Client</h2>
              <p className="mt-2 text-zinc-300">Section en construction.</p>
            </div>
          )}

          {activeSection === "facturation" && (
            <div className="rounded-lg border border-white/10 bg-black/35 p-8 backdrop-blur-sm">
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
                  placeholder="Nom du client"
                  className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/30"
                  value={newProject.client}
                  onChange={(e) =>
                    setNewProject({ ...newProject, client: e.target.value })
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

              <div>
                <label className="mb-2 block text-sm text-zinc-200">
                  Chargé de projets
                </label>
                <input
                  placeholder="Nom du chargé"
                  className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/30"
                  value={newProject.charge}
                  onChange={(e) =>
                    setNewProject({ ...newProject, charge: e.target.value })
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