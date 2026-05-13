import clsx from 'clsx';

type Props = {
  name: string;
  initials: string;
  color: string;
  imageUrl?: string | null;
  size?: number;
  className?: string;
};

export default function PlayerAvatar({ name, initials, color, imageUrl, size = 40, className }: Props) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        className={clsx('rounded-full object-cover ring-1 ring-bdr', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  const fontSize = Math.max(10, Math.round(size * 0.4));
  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center font-bold text-white select-none ring-1 ring-bdr',
        className,
      )}
      style={{ width: size, height: size, backgroundColor: color, fontSize }}
      aria-label={name}
      title={name}
    >
      {initials}
    </div>
  );
}
