import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Line Page</h1>
        <p className="mt-4 text-base text-neutral-600 dark:text-neutral-300">
          Uma pagina unica, limpa e extremamente simples.
        </p>
        <Link
          to="/pipeline"
          className="mt-8 rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-neutral-900"
        >
          Entrar
        </Link>
      </section>
    </main>
  )
}
