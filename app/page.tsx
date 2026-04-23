export default function Home() {
  return (
    <main className="relative w-full h-screen overflow-hidden">
      
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-[20%_top]"
        style={{ backgroundImage: "url('/eric-login-bg.png')" }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Center login box */}
      <div className="relative z-10 flex items-center justify-center h-full">
        <div className="bg-black/80 backdrop-blur-md rounded-2xl p-8 w-[90%] max-w-md text-center border border-white/10 shadow-2xl">

          <h1 className="text-2xl font-semibold text-white mb-4">
            Connexion à ERIC
          </h1>

          <p className="text-zinc-300 text-sm mb-6">
            Accédez à votre environnement Estimation, Réglementation,
            Inventaire et Client.
          </p>

          <button className="w-full bg-white text-black py-3 rounded-lg font-medium hover:bg-zinc-200 transition">
            Continuer avec Google
          </button>

          <p className="text-xs text-zinc-500 mt-4">
            Accès réservé aux utilisateurs autorisés
          </p>

        </div>
      </div>
    </main>
  );
}