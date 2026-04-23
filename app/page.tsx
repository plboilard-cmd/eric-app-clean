"use client";

import { useEffect, useState } from "react";

const allowedUsers = [
  { username: "pierre-luc", code: "0580", name: "Pierre-Luc" },
  { username: "veronique", code: "5926", name: "Véronique" },
];

type Project = {
  id: number;
  client: string;
  description: string;
  statut: string;
  charge: string;
};

type ActiveSection = "projets" | "plans" | "clients" | "facturation";

export default function Home() {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [activeSection, setActiveSection] =
    useState<ActiveSection>("projets");

  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [newProject, setNewProject] = useState({
    client: "",
    description: "",
    statut: "Exécution",
    charge: "",
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("eric-user");
    const savedProjects = localStorage.getItem("eric-projects");

    if (savedUser) setLoggedInUser(savedUser);
    if (savedProjects) setProjects(JSON.parse(savedProjects));
  }, []);

  const handleLogin = (e: any) => {
    e.preventDefault();

    const match = allowedUsers.find(
      (user) =>
        user.username.toLowerCase() === username.toLowerCase().trim() &&
        user.code === code.trim()
    );

    if (!match) {
      setError("Identifiant invalide");
      return;
    }

    setLoggedInUser(match.name);
    localStorage.setItem("eric-user", match.name);
  };

  const handleLogout = () => {
    localStorage.removeItem("eric-user");
    setLoggedInUser(null);
  };

  const addProject = () => {
    const newEntry: Project = {
      id: Date.now(),
      ...newProject,
    };

    const updated = [...projects, newEntry];
    setProjects(updated);
    localStorage.setItem("eric-projects", JSON.stringify(updated));

    setShowModal(false);
    setNewProject({
      client: "",
      description: "",
      statut: "Exécution",
      charge: "",
    });
  };

  // ================= LOGIN =================
  if (!loggedInUser) {
    return (
      <main className="relative h-screen flex items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-[20%_top]"
          style={{ backgroundImage: "url('/eric-login-bg.png')" }}
        />
        <div className="absolute inset-0 bg-black/70" />

        <form
          onSubmit={handleLogin}
          className="relative z-10 bg-black/80 p-8 rounded-xl w-96 text-white"
        >
          <h1 className="text-xl mb-6">Connexion ERIC</h1>

          <input
            placeholder="Utilisateur"
            className="w-full mb-3 p-2 bg-black border"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            placeholder="Code"
            type="password"
            className="w-full mb-3 p-2 bg-black border"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          {error && <p className="text-red-400">{error}</p>}

          <button className="w-full mt-3 bg-white text-black p-2">
            Se connecter
          </button>
        </form>
      </main>
    );
  }

  // ================= DASHBOARD =================
  return (
    <main className="relative min-h-screen text-white">
      <div
        className="absolute inset-0 bg-cover bg-[20%_top]"
        style={{ backgroundImage: "url('/eric-login-bg.png')" }}
      />
      <div className="absolute inset-0 bg-black/80" />

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between mb-6">
          <h1>ERIC - {loggedInUser}</h1>
          <button onClick={handleLogout}>Déconnexion</button>
        </div>

        {/* MENU */}
        <div className="flex gap-4 mb-6">
          {["projets", "plans", "clients", "facturation"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSection(tab as ActiveSection)}
              className={`px-4 py-2 border ${
                activeSection === tab ? "bg-white text-black" : ""
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* TABLE */}
        {activeSection === "projets" && (
          <>
            <div className="bg-white text-black">
              <table className="w-full">
                <thead className="bg-orange-400">
                  <tr>
                    <th>Client</th>
                    <th>Description</th>
                    <th>Statut</th>
                    <th>Chargé</th>
                    <th>Lien</th>
                  </tr>
                </thead>

                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id}>
                      <td>{p.client}</td>
                      <td>{p.description}</td>
                      <td>{p.statut}</td>
                      <td>{p.charge}</td>
                      <td>
                        <button>Ouvrir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* BOUTON NOUVEAU */}
            <div className="mt-6">
              <button
                onClick={() => setShowModal(true)}
                className="bg-white text-black px-4 py-2"
              >
                + Nouveau projet
              </button>
            </div>
          </>
        )}

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
            <div className="bg-black p-6 w-96 border">
              <h2 className="mb-4">Nouveau projet</h2>

              <input
                placeholder="Client"
                className="w-full mb-2 p-2 bg-black border"
                value={newProject.client}
                onChange={(e) =>
                  setNewProject({ ...newProject, client: e.target.value })
                }
              />

              <input
                placeholder="Description"
                className="w-full mb-2 p-2 bg-black border"
                value={newProject.description}
                onChange={(e) =>
                  setNewProject({
                    ...newProject,
                    description: e.target.value,
                  })
                }
              />

              <input
                placeholder="Chargé de projet"
                className="w-full mb-2 p-2 bg-black border"
                value={newProject.charge}
                onChange={(e) =>
                  setNewProject({
                    ...newProject,
                    charge: e.target.value,
                  })
                }
              />

              <div className="flex gap-2 mt-4">
                <button onClick={addProject} className="bg-white text-black px-3 py-2">
                  Ajouter
                </button>

                <button onClick={() => setShowModal(false)}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}