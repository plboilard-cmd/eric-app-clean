export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-3xl text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-400 mb-4">
          ERIC
        </p>

        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Estimation · Réglementation · Inventaire · Client
        </h1>

        <p className="text-zinc-300 text-lg md:text-xl mb-10">
          La base de travail pour gérer tes projets, tes clients et ton suivi
          signalisation au même endroit.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition">
            Entrer dans ERIC
          </button>

          <button className="px-6 py-3 rounded-xl border border-zinc-700 text-white font-semibold hover:bg-zinc-900 transition">
            Voir les projets
          </button>
        </div>
      </div>
    </main>
  );
}
