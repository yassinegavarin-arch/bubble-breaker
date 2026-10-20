import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap" style={{ paddingTop: 150 }}><div className="empty">
      Page introuvable. <Link href="/">Retour aux personnalités</Link>
    </div></div>
  );
}
