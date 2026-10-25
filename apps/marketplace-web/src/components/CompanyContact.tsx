import { companyContact } from "@/lib/company";

const tones = {
  site: {
    title: "text-[14px] font-semibold",
    list: "mt-4 space-y-2.5",
    item: "text-[14px] text-muted",
    link: "text-[14px] text-muted hover:text-ink",
  },
  home: {
    title: "text-sm font-semibold text-navy",
    list: "mt-4 space-y-3",
    item: "text-[15px] text-ink-muted",
    link: "text-[15px] text-ink-muted transition-colors duration-150 hover:text-navy",
  },
} as const;

type CompanyContactProps = {
  title: string;
  numberLabel: string;
  tone: keyof typeof tones;
  heading?: "p" | "h3";
};

export function CompanyContact({
  title,
  numberLabel,
  tone,
  heading = "p",
}: CompanyContactProps) {
  const styles = tones[tone];
  const Heading = heading;

  return (
    <div>
      <Heading className={styles.title}>{title}</Heading>
      <ul className={styles.list}>
        <li>
          <a href={`mailto:${companyContact.email}`} className={styles.link}>
            {companyContact.email}
          </a>
        </li>
        <li className={styles.item}>
          <span className="sr-only">{numberLabel} </span>
          {companyContact.enterpriseNumber}
        </li>
        <li className={styles.item}>
          {companyContact.street}
          <br />
          {companyContact.city}
        </li>
      </ul>
    </div>
  );
}
