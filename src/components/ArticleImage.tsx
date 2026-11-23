import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faNewspaper } from '@fortawesome/free-solid-svg-icons';

interface ArticleImageProps {
  src?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  compact?: boolean;
}

export const ArticleImage: React.FC<ArticleImageProps> = ({
  src,
  alt,
  className = '',
  imgClassName = '',
  compact = false,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        aria-hidden="true"
        className={`flex items-center justify-center overflow-hidden bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 select-none ${className}`}
      >
        {compact ? (
          <div className="flex flex-col items-center justify-center gap-1 px-2 text-center">
            <FontAwesomeIcon icon={faNewspaper} className="text-base sm:text-lg" />
            <span className="font-serif text-[11px] font-bold tracking-tight leading-none">
              Briefly
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2.5 px-4">
            <FontAwesomeIcon icon={faNewspaper} className="text-lg sm:text-xl" />
            <span className="font-serif text-lg sm:text-xl font-bold tracking-tight">
              Briefly
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${className}`}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02] ${imgClassName}`}
      />
    </div>
  );
};
