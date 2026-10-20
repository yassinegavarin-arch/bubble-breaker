import type { Metadata } from "next";
import { PERSONALITIES } from "@/data/personalities";
import { getPortraits } from "@/lib/portraits";

export const metadata: Metadata = { title: "Crédits photos" };
export const revalidate = 86400;

export default async function Credits() {
  const portraits = await getPortraits();
  return (
    <div className="wrap prose">
      <span className="kicker">Crédits</span>
      <h1>Crédits photos</h1>
      <p className="lead">
        Les portraits sont l&apos;image principale de l&apos;article Wikipédia de chaque personnalité. Ils proviennent
        de Wikimedia Commons et sont publiés sous licence libre. L&apos;auteur et la licence exacte de chaque photo
        figurent sur sa page Commons.
      </p>
      <table className="list">
        <thead>
          <tr>
            <th>Personnalité</th>
            <th>Source et licence</th>
          </tr>
        </thead>
        <tbody>
          {PERSONALITIES.map((p) => {
            const portrait = portraits[p.slug];
            return (
              <tr key={p.slug}>
                <td>
                  {p.first_name} {p.last_name}
                </td>
                <td>
                  {portrait ? (
                    <a href={portrait.credit} target="_blank" rel="noopener noreferrer">
                      Page Wikimedia Commons
                    </a>
                  ) : (
                    <span className="muted">Pas de portrait</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="small muted">Image du haut de page : visuel fourni par l&apos;éditeur.</p>
    </div>
  );
}
