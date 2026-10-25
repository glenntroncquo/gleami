import { MapPinIcon } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import styles from "@/components/marketplace/SalonExplorer.module.css";

export default function Loading() {
  return (
    <main id="main" className={styles.explorer} aria-busy="true" aria-label="Gleami">
      <div className={styles.skeletonHeader} aria-hidden="true">
        <Logo className="h-7 w-auto" />
        <div className={`${styles.skeleton} ${styles.skeletonSearch}`} />
        <div className={`${styles.skeleton} h-9 w-9 rounded-full`} />
      </div>
      <div className={styles.workspace} aria-hidden="true">
        <div className={styles.list}>
          <div className={styles.skeletonToolbar}>
            <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
            <div className={`${styles.skeleton} ${styles.skeletonSubtitle}`} />
            <div className={styles.skeletonDates}>
              {Array.from({ length: 8 }, (_, index) => <div key={index} className={`${styles.skeleton} ${styles.skeletonDate}`} />)}
            </div>
          </div>
          <div className={styles.resultBody}>
            <div className={styles.cards}>
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index}>
                  <div className={`${styles.skeleton} ${styles.skeletonImage}`} />
                  <div className={`${styles.skeleton} ${styles.skeletonName}`} />
                  <div className={`${styles.skeleton} ${styles.skeletonLocation}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.mapPane}>
          <div className={styles.mapFrame}><div className={styles.mapLoading}><span><MapPinIcon size={22} strokeWidth={1.5} /></span></div></div>
        </div>
      </div>
    </main>
  );
}
