import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      Page introuvable. <Link href="/">Retour aux personnalités</Link>
    </div>
  );
}
