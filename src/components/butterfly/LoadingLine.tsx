type LoadingLineProps = {
  progress: number;
  complete: boolean;
};

export function LoadingLine({ progress, complete }: LoadingLineProps) {
  return (
    <div
      className={`loading-line${complete ? " loading-line--complete" : ""}`}
      role="progressbar"
      aria-label="Загрузка сайта"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
    >
      <span className="loading-line__track" aria-hidden="true">
        <span className="loading-line__fill" style={{ transform: `scaleX(${progress})` }} />
      </span>
    </div>
  );
}
