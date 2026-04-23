export default function Home() {
  return (
    <main className="relative min-h-screen text-white">

      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/eric-login-bg.png')" }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        
        <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-10 w-full max-w-md text-center shadow-2xl">

          <h1 className="text-3xl font-bold mb-4">Connexion à ERIC</h1>

          <p className="text-zinc-300 mb-8">
            Accédez à votre environnement Estimation, Réglementation, Inventaire et Client.
          </p>

          <button className="w-full bg-white text-black py-3 rounded-xl font-semibold hover:bg-zinc-200 transition">
            Continuer avec Google
          </button>

          <p className="text-xs text-zinc-500 mt-6">
            Accès réservé aux utilisateurs autorisés
          </p>

        </div>

      </div>

    </main>
  );
}