"use client";

import { useState } from "react";

const allowedUsers = [
  { username: "pierre-luc", code: "0580", name: "Pierre-Luc" },
  { username: "veronique", code: "5926", name: "Véronique" },
];

export default function Home() {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const match = allowedUsers.find(
      (user) =>
        user.username.toLowerCase() === username.toLowerCase().trim() &&
        user.code === code.trim()
    );

    if (!match) {
      setError("Identifiant ou code d’accès invalide.");
      setLoggedInUser(null);
      return;
    }

    setError("");
    setLoggedInUser(match.name);
  };

  if (loggedInUser) {
    return (
      <main className="relative w-full h-screen overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-[20%_top]"
          style={{ backgroundImage: "url('/eric-login-bg.png')" }}
        />
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-10 flex items-center justify-center h-full px-4">
          <div className="bg-black/80 backdrop-blur-md rounded-2xl p-8 w-full max-w-xl text-center border border-white/10 shadow-2xl">
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-400 mb-3">
              ERIC
            </p>

            <h1 className="text-3xl font-semibold text-white mb-4">
              Bienvenue {loggedInUser}
            </h1>

            <p className="text-zinc-300 mb-8">
              Vous êtes maintenant connecté à ERIC.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <button className="rounded-xl bg-white text-black py-3 px-4 font-medium hover:bg-zinc-200 transition">
                Projets
              </button>
              <button className="rounded-xl border border-white/10 bg-white/5 text-white py-3 px-4 font-medium hover:bg-white/10 transition">
                Clients
              </button>
            </div>

            <button
              onClick={() => {
                setLoggedInUser(null);
                setUsername("");
                setCode("");
                setError("");
              }}
              className="mt-6 text-sm text-zinc-400 hover:text-white transition"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative w-full h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-[20%_top]"
        style={{ backgroundImage: "url('/eric-login-bg.png')" }}
      />

      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 flex items-center justify-center h-full px-4">
        <div className="bg-black/80 backdrop-blur-md rounded-2xl p-8 w-full max-w-md text-center border border-white/10 shadow-2xl">
          <h1 className="text-2xl font-semibold text-white mb-2">
            Connexion à ERIC
          </h1>

          <p className="text-zinc-300 text-sm mb-6">
            Entrez votre identifiant et votre code d’accès pour continuer.
          </p>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="text-left">
              <label className="block text-sm text-zinc-200 mb-2">
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

            <div className="text-left">
              <label className="block text-sm text-zinc-200 mb-2">
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

            {error && (
              <p className="text-sm text-red-400 text-left">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-white text-black py-3 rounded-lg font-medium hover:bg-zinc-200 transition"
            >
              Se connecter
            </button>
          </form>

          <p className="text-xs text-zinc-500 mt-5">
            Accès réservé aux utilisateurs autorisés
          </p>
        </div>
      </div>
    </main>
  );
}