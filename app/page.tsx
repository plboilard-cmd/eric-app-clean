export default function Home() {
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

          <form className="space-y-4">
            <div className="text-left">
              <label className="block text-sm text-zinc-200 mb-2">
                Identifiant
              </label>
              <input
                type="text"
                placeholder="Ex. pierreluc"
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
                className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-zinc-400 outline-none focus:border-white/30"
              />
            </div>

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