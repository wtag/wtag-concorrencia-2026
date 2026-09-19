#!/bin/bash
# Comprime os vídeos do deck para caber no GitHub, sem tocar nos masters.
#
# Por que existe: os originais somavam 881 MB e um deles tinha 312 MB. O GitHub
# bloqueia qualquer arquivo acima de 100 MB, então sem isso o push nem começa.
# O desperdício estava concentrado em arquivos que saíram do editor com bitrate
# de EXPORTAÇÃO (20,9 · 9,9 · 9,4 · 5,7 Mbit/s) em vez de bitrate de entrega.
#
# O que este script NÃO comprime, de propósito:
#   · sede-sao-paulo e sede-novo-hamburgo — já estão em 720×1280 a 1,5–1,8 Mbit/s.
#     Recomprimir só perderia qualidade num cartão de 872×614. Somam 31 MB.
#   · os três depoimentos do Sicredi — saíram do repositório e viraram embed do
#     YouTube (são 22 min de vídeo, 267 MB).
#
# Lê de ../_Assets/Videos-Alta/ e escreve em assets/video/. Rodar duas vezes dá
# o mesmo resultado. Os masters nunca são tocados.
#
#     ./comprimir-videos.sh              # comprime
#     ./comprimir-videos.sh --conferir   # só mostra o que faria

set -euo pipefail

# Os masters ficam no Drive, FORA do repositório (881 MB não vão para o git).
# O repositório mora em ~/Projetos, então o caminho não pode ser relativo a ele.
# Dá para apontar outro lugar com:  ALTA=/outro/caminho ./comprimir-videos.sh
ALTA="${ALTA:-$HOME/Library/CloudStorage/GoogleDrive-bernardo@wt.ag/Meu Drive/Credenciais WT.AG/_Assets/Videos-Alta}"
DEST="assets/video"
CONFERIR=false
[[ "${1:-}" == "--conferir" ]] && CONFERIR=true

# ffmpeg: usa o do PATH; se não houver, cai no binário estático do imageio-ffmpeg
FF="${FFMPEG:-}"
if [[ -z "$FF" ]]; then
  if command -v ffmpeg >/dev/null; then FF=ffmpeg
  else
    FF=$(python3 -c "import imageio_ffmpeg as i;print(i.get_ffmpeg_exe())" 2>/dev/null || true)
  fi
fi
if [[ -z "$FF" ]] || ! "$FF" -version >/dev/null 2>&1; then
  echo "sem ffmpeg. Duas formas de resolver:"
  echo "    pip3 install --user imageio-ffmpeg     # não mexe no sistema"
  echo "    brew install ffmpeg                    # se preferir o Homebrew"
  exit 1
fi

if [[ ! -d "$ALTA" ]]; then
  echo "não achei a pasta dos masters:"
  echo "    $ALTA"
  echo "Se o Drive estiver em outro caminho, aponte com:"
  echo "    ALTA=/caminho/para/Videos-Alta ./comprimir-videos.sh"
  exit 1
fi

# ── por que existe esta checagem ────────────────────────────────────────────
# Os masters vivem no Google Drive, e o Drive pode entregar leitura PARCIAL de um
# arquivo que ele ainda não materializou: os primeiros 8 MiB vêm certos e o resto
# vem corrompido. Foi exatamente o que aconteceu com o case-magalu.mp4 — 873
# erros de NAL, 115 frames faltando — e o vídeo publicado pulava trecho e
# congelava. Nada acusou na hora, porque o ffmpeg contorna erro de origem em
# silêncio e a duração continuou batendo.
#
# Agora, antes de comprimir, cada master é decodificado por inteiro. Se acusar
# erro, o script PARA em vez de gerar um arquivo quebrado.
conferir_master () {
  local f="$1"
  cat "$f" > /dev/null                       # força o Drive a materializar tudo
  local e
  e=$("$FF" -nostdin -v error -i "$f" -f null - 2>&1 | wc -l | tr -d ' ')
  if [[ "$e" != "0" ]]; then
    echo
    echo "  !! $(basename "$f"): $e erros de decodificação no MASTER."
    echo "     Comprimir daqui gera vídeo que pula e congela. Duas causas comuns:"
    echo "     · o Drive entregou leitura parcial — apague a cópia e copie de novo"
    echo "     · o master é mesmo defeituoso — procure o original em _Assets/Vídeos/"
    return 1
  fi
  return 0
}

# só estes entram na compressão; o resto fica como está
ALVOS=(case-magalu case-central-do-corre case-odontoprev
       case-pulando-o-bloco case-sicredi showreel-wtag
       case-barrashoppingsul case-golden-lake
       case-barrashoppingsul-v1 case-barrashoppingsul-v2 case-barrashoppingsul-v3
       case-golden-lake-v1 case-golden-lake-v2 case-golden-lake-v3
       case-keeta-brasil-corre
       case-bridgestone-pneu-novo
       case-bridgestone-pneu-novo-v1 case-bridgestone-pneu-novo-v2
       case-bridgestone-pneu-novo-v3 case-bridgestone-pneu-novo-v4)
BV=1500k
LADO=1920

# Os seis conteúdos das pilhas de miniaturas saem menores de propósito: são
# mídia SECUNDÁRIA, que abre no lightbox limitado a 86vh, e não o videocase
# principal. Lado maior 1280 a 1200k em vez de 1920 a 1500k economiza ~40% e
# não muda nada no que se vê. Sem esta lista, rodar o script de novo os
# reencodaria maiores — e em silêncio.
SECUNDARIOS="case-barrashoppingsul-v1 case-barrashoppingsul-v2 case-barrashoppingsul-v3 case-golden-lake-v1 case-golden-lake-v2 case-golden-lake-v3"

# A Bridgestone é o primeiro case de mídia vertical: os masters são 1080×1920 e
# os cartões na tela têm 478 (herói) e 228 (os quatro da grade) de largura.
# O `lado` do scale vale para o LADO MAIOR, que aqui é a altura: 1280 devolve
# 720×1280 e 1080 devolve 608×1080 — 1,5× e 2,7× o tamanho de tela, que é
# margem de sobra. Deixar no 1920 padrão gravaria 1080×1920, quatro vezes mais
# pixels do que o cartão usa, por nenhum ganho visível.
VERT_HERO="case-bridgestone-pneu-novo"
VERT_GRADE="case-bridgestone-pneu-novo-v1 case-bridgestone-pneu-novo-v2 case-bridgestone-pneu-novo-v3 case-bridgestone-pneu-novo-v4"
FALHAS=0

for nome in "${ALVOS[@]}"; do
  # O master pode chegar como .mp4 ou .mov: o que sai da ilha de edição é
  # QuickTime com frequência, e o ffmpeg não se importa com a extensão. Antes
  # daqui só .mp4 era procurado, e um master .mov era reportado como "sem
  # master" — silenciosamente, o que é o pior jeito de descobrir.
  orig=""
  for ext in mp4 mov MOV MP4; do
    [[ -f "$ALTA/$nome.$ext" ]] && { orig="$ALTA/$nome.$ext"; break; }
  done
  saida="$DEST/$nome.mp4"
  [[ -n "$orig" ]] || { echo "  $nome — sem master, pulando"; continue; }
  antes=$(stat -f%z "$orig")
  if ! conferir_master "$orig"; then FALHAS=$((FALHAS+1)); continue; fi
  # Definido ANTES do ensaio: um --conferir que informa 1500k e depois grava
  # 1200k é pior que não ter ensaio nenhum.
  bv="$BV"; lado="$LADO"; mx=2000k
  case " $SECUNDARIOS " in *" $nome "*) bv=1200k; lado=1280; mx=1600k ;; esac
  case " $VERT_HERO "  in *" $nome "*) bv=1200k; lado=1280; mx=1600k ;; esac
  case " $VERT_GRADE " in *" $nome "*) bv=800k;  lado=1080; mx=1100k ;; esac
  if $CONFERIR; then
    printf '  %-26s %7.1f MB → lado %s, alvo %s\n' "$nome" \
      "$(bc -l <<< "$antes/1048576")" "$lado" "$bv"
    continue
  fi
  # -vf scale: reduz o LADO MAIOR para 1920 e nunca amplia. Assim serve tanto
  #   para 1920×1080 quanto para os verticais 1080×1920 (o odontoprev é vertical).
  #   -2 mantém a paridade que o H.264 exige.
  # -movflags +faststart: o moov vai para o começo, então o vídeo toca antes de
  #   baixar inteiro — indispensável servindo por HTTP no GitHub Pages.
  "$FF" -nostdin -loglevel error -y -i "$orig" \
    -vf "scale='if(gt(iw,ih),min($lado,iw),-2)':'if(gt(iw,ih),-2,min($lado,ih))'" \
    -c:v libx264 -preset slow -b:v "$bv" -maxrate "$mx" -bufsize 4M \
    -profile:v high -level 4.2 -pix_fmt yuv420p \
    -c:a aac -b:a 128k -ac 2 \
    -movflags +faststart "$saida"
  depois=$(stat -f%z "$saida")
  # Frame count é o que pega pulo e congelamento; duração sozinha não pega,
  # porque um vídeo com frames faltando mantém a duração.
  fm=$("$FF" -nostdin -i "$orig"  -map 0:v:0 -f null - 2>&1 | grep -oE 'frame= *[0-9]+' | tail -1 | grep -oE '[0-9]+')
  fs=$("$FF" -nostdin -i "$saida" -map 0:v:0 -f null - 2>&1 | grep -oE 'frame= *[0-9]+' | tail -1 | grep -oE '[0-9]+')
  if [[ "$fm" != "$fs" ]]; then
    echo "  !! $nome: master tem $fm frames, saída tem $fs. Vai pular na reprodução."
    FALHAS=$((FALHAS+1))
  fi
  printf '  %-26s %7.1f MB → %6.1f MB  (%.0f%% menor) · %s frames\n' "$nome" \
    "$(bc -l <<< "$antes/1048576")" "$(bc -l <<< "$depois/1048576")" \
    "$(bc -l <<< "100*(1-$depois/$antes)")" "$fs"
done

if ! $CONFERIR; then
  echo; echo "assets/video agora:"; du -sh "$DEST"
  echo "acima de 100 MB (o GitHub bloqueia):"
  find "$DEST" -name '*.mp4' -size +100M -print -quit | grep -q . \
    && find "$DEST" -name '*.mp4' -size +100M -exec ls -lh {} \; \
    || echo "  nenhum"
  echo
  if [[ "$FALHAS" -gt 0 ]]; then
    echo "$FALHAS problema(s). NÃO publique sem resolver."
    exit 1
  fi
  echo "Tudo conferido: masters limpos e frame count batendo em todos."
fi
