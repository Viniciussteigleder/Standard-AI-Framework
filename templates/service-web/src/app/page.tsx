import { Chat } from '@/components/chat';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            AI Framework
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Your AI-powered application is ready.
          </p>
        </header>
        
        <div className="max-w-4xl mx-auto">
          <Chat />
        </div>
      </div>
    </main>
  );
}
