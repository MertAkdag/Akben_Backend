/**
 * @prisma/adapter-pg + `pg` için doğrudan Postgres URL'i.
 * `prisma+postgres://` veya `prisma://` adresleri yalnızca Prisma CLI/engine içindir; Node pg ile kullanılamaz.
 */
export function getPoolConnectionString(): string {
  const candidates = [
    process.env.POSTGRES_DIRECT_URL,
    process.env.DIRECT_URL,
    process.env.POSTGRES_URL,
  ].filter((v): v is string => Boolean(v && v.trim()));

  if (candidates.length > 0) {
    return candidates[0]!;
  }

  const u = process.env.DATABASE_URL;
  if (!u?.trim()) {
    throw new Error(
      "Postgres bağlantısı yok. .env içinde şunlardan biri tanımlayın: POSTGRES_DIRECT_URL, DIRECT_URL veya doğrudan postgresql:// içeren DATABASE_URL.",
    );
  }

  if (u.startsWith("prisma+") || u.startsWith("prisma://")) {
    throw new Error(
      "DATABASE_URL şu an prisma proxy formatında (prisma+ / prisma://). Uygulama pg ile doğrudan Postgres’e bağlanır.\n" +
        "Çözüm: .env dosyasına aynı veritabanına giden doğrudan URL ekleyin, örneğin:\n" +
        "  POSTGRES_DIRECT_URL=\"postgresql://KULLANICI:SIFRE@localhost:5432/VERITABANI?schema=public\"\n" +
        "(Prisma Local / `prisma dev` çıktısındaki shadow doğrudan bağlantıyı da kullanabilirsiniz.)",
    );
  }

  return u;
}
