import Header from './components/Header'
import PriceConfigurator from './components/PriceConfigurator'

function App() {
  return (
    <div className="min-h-screen bg-wieben-cream">
      <Header />
      <main>
        <div className="mx-auto max-w-4xl px-4 pt-12 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-wieben-forest sm:text-4xl">Byg jeres prisestimat</h1>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-wieben-forest/70">
            Svar på 8 korte spørgsmål, så guider vi jer trygt til et realistisk prisoverslag for jeres messestand —
            ingen forpligtelser, ingen opkald nødvendigt for at komme i gang.
          </p>
        </div>
        <PriceConfigurator />
      </main>
    </div>
  )
}

export default App
