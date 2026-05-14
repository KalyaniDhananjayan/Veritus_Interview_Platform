export default function Footer() {
  return (
    <footer className="border-t border-zinc-900 bg-zinc-950 py-8 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p className="text-zinc-500 text-sm">
          &copy; {new Date().getFullYear()} VERITUS Platform. All rights reserved.
        </p>
        <p className="text-zinc-600 text-xs mt-2">
          AI-Powered Interview Intelligence.
        </p>
      </div>
    </footer>
  );
}
