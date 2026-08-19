import Header from './components/Header'
import PriceConfigurator from './components/PriceConfigurator'

function App() {
  return (
    <div className="min-h-screen bg-wieben-cream">
      <Header />
      <main>
        <div className="mx-auto max-w-4xl px-4 pt-12 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-wieben-forest sm:text-4xl">Byg jeres prisestimat</h1>
        </div>
        <PriceConfigurator />
      </main>
    </div>
  )
}

export default App
