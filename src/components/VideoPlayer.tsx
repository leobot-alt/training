import { useEffect, useRef, useState } from 'react';
import { Clapperboard, ExternalLink } from 'lucide-react';
import { embedUrl } from '@/lib/treinamento';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  titulo: string;
  startAt?: number;
  onProgress?: (segundos: number, percentual: number) => void;
  onEnded?: () => void;
}

export function VideoPlayer({ src, titulo, startAt = 0, onProgress, onEnded }: VideoPlayerProps) {
  const embed = embedUrl(src);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [erro, setErro] = useState(false);
  const ultimoReport = useRef(0);

  useEffect(() => {
    setErro(false);
  }, [src]);

  if (!src) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/40 text-center">
        <Clapperboard className="h-8 w-8 text-muted-foreground" />
        <div className="px-6">
          <p className="text-sm font-medium">Vídeo ainda não publicado</p>
          <p className="mt-1 text-xs text-muted-foreground">
            A equipe está finalizando esta aula. Você será avisado por e-mail quando ela for liberada.
          </p>
        </div>
      </div>
    );
  }

  if (embed) {
    return (
      <div className="space-y-2">
        <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
          <iframe
            src={embed}
            title={titulo}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ExternalLink className="h-3 w-3" />
          Vídeo hospedado em plataforma externa: marque a aula como concluída ao terminar de assistir.
        </p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/40 px-6 text-center">
        <Clapperboard className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Não foi possível carregar o vídeo</p>
        <p className="text-xs text-muted-foreground">
          Verifique se o arquivo está acessível ou substitua o link em Admin › Treinamentos.
        </p>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        preload="metadata"
        className={cn('h-full w-full')}
        onLoadedMetadata={() => {
          if (videoRef.current && startAt > 0 && startAt < videoRef.current.duration - 5) {
            videoRef.current.currentTime = startAt;
          }
        }}
        onTimeUpdate={() => {
          const video = videoRef.current;
          if (!video || !video.duration) return;
          const percentual = Math.min(100, (video.currentTime / video.duration) * 100);
          const agora = Date.now();
          if (agora - ultimoReport.current > 1500) {
            ultimoReport.current = agora;
            onProgress?.(video.currentTime, percentual);
          }
        }}
        onEnded={() => onEnded?.()}
        onError={() => setErro(true)}
      />
    </div>
  );
}

export function isEmbedVideo(url: string) {
  return Boolean(embedUrl(url));
}
