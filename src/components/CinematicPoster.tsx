import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Stage, Layer, Rect, Text, Image, Circle, RegularPolygon } from 'react-konva';
import { getOptimizedImageUrl } from '../utils/image';

interface CinematicPosterProps {
  title: string;
  coverUrl?: string;
  rating?: string | number;
  year?: string;
  genre?: string;
  description?: string;
  isTvSeries?: boolean;
  seasonsCount?: number;
  duration?: string;
  shareUrl?: string;
}

export interface PosterRef {
  getStageDataUrl: () => string;
}

export const CinematicPoster = forwardRef<PosterRef, CinematicPosterProps>(
  ({ title, coverUrl, rating, year, genre, description, isTvSeries, seasonsCount, duration, shareUrl }, ref) => {
    const stageRef = React.useRef<any>(null);
    const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
    const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
    const [qrImg, setQrImg] = useState<HTMLImageElement | null>(null);

    // Cinematic Landscape Widescreen format (580x400)
    const W = 580;
    const H = 400;

    // Load brand logo image
    useEffect(() => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = '/logo.png';
      img.onload = () => {
        setLogoImg(img);
      };
      img.onerror = () => {
        const fallback = new window.Image();
        fallback.crossOrigin = 'anonymous';
        fallback.src = 'https://runflix.name.ng/logo.png';
        fallback.onload = () => {
          setLogoImg(fallback);
        };
      };
    }, []);

    // Load tiny dynamic QR Code image
    useEffect(() => {
      if (!shareUrl) {
        setQrImg(null);
        return;
      }
      const encoded = encodeURIComponent(shareUrl);
      const url = `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=100x100&bgcolor=0b0b0f&color=ffffff&format=png&margin=10`;
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      img.onload = () => {
        setQrImg(img);
      };
    }, [shareUrl]);

    // Load background image with CORS enabled
    useEffect(() => {
      if (!coverUrl) {
        setBgImage(null);
        return;
      }

      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = getOptimizedImageUrl(coverUrl, 700);

      img.onload = () => {
        setBgImage(img);
        setImageDimensions({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        const fallbackImg = new window.Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.src = coverUrl;
        fallbackImg.onload = () => {
          setBgImage(fallbackImg);
          setImageDimensions({ width: fallbackImg.width, height: fallbackImg.height });
        };
      };
    }, [coverUrl]);

    // Expose data URL extraction for parent components
    useImperativeHandle(ref, () => ({
      getStageDataUrl: () => {
        if (!stageRef.current) return '';
        return stageRef.current.toDataURL({ pixelRatio: 3 }); // Export at 3x ultra-sharp quality
      },
    }));

    // Calculate crop for standard object-cover centering
    let cropProps = {};
    if (bgImage && imageDimensions.width > 0 && imageDimensions.height > 0) {
      const imageRatio = imageDimensions.width / imageDimensions.height;
      const canvasRatio = W / H;
      let cropX = 0;
      let cropY = 0;
      let cropWidth = imageDimensions.width;
      let cropHeight = imageDimensions.height;

      if (imageRatio > canvasRatio) {
        cropWidth = imageDimensions.height * canvasRatio;
        cropX = (imageDimensions.width - cropWidth) / 2;
      } else {
        cropHeight = imageDimensions.width / canvasRatio;
        cropY = (imageDimensions.height - cropHeight) / 2;
      }

      cropProps = {
        crop: {
          x: cropX,
          y: cropY,
          width: cropWidth,
          height: cropHeight,
        },
      };
    }

    // Dynamic badges logic
    const badges: string[] = [];
    
    // 1. Show Type Badge
    badges.push(isTvSeries ? 'TV SERIES' : 'MOVIE');

    // 2. Seasons Badge (if TV) or Duration Badge (if Movie)
    if (isTvSeries) {
      if (seasonsCount && seasonsCount > 0) {
        badges.push(`${seasonsCount} ${seasonsCount === 1 ? 'SEASON' : 'SEASONS'}`);
      }
    } else if (duration) {
      badges.push(duration.toUpperCase());
    }

    // 3. Year
    if (year) {
      badges.push(year);
    }

    // 4. Genre
    if (genre) {
      const firstGenre = genre.split(',')[0].trim();
      if (firstGenre) {
        badges.push(firstGenre.toUpperCase());
      }
    }

    // 5. No Ads
    badges.push('NO ADS');

    // 6. Ultra HD
    badges.push('ULTRA HD');

    const badgeGap = 6;
    const startX = 24;
    const badgePositions: number[] = [];
    let currentX = startX;
    
    badges.forEach((badge) => {
      badgePositions.push(currentX);
      const textWidth = badge.length * 5.2 + 14;
      currentX += textWidth + badgeGap;
    });

    const getFontSize = (titleStr: string) => {
      if (titleStr.length > 35) return 15;
      if (titleStr.length > 24) return 18;
      if (titleStr.length > 15) return 22;
      return 26;
    };

    const siteDomain = window.location.host || 'runflix.name.ng';

    return (
      <div className="relative select-none overflow-hidden rounded-[24px] border border-white/10 bg-[#0b0b0f] shadow-2xl shadow-black/50">
        <Stage width={W} height={H} ref={stageRef}>
          <Layer>
            {/* Fallback solid background */}
            <Rect x={0} y={0} width={W} height={H} fill="#0b0b0f" />

            {/* Background Image (object-cover) */}
            {bgImage && (
              <Image
                x={0}
                y={0}
                width={W}
                height={H}
                image={bgImage}
                {...cropProps}
              />
            )}

            {/* Cinematic top-down dark vignette */}
            <Rect
              x={0}
              y={0}
              width={W}
              height={110}
              fillLinearGradientStartPoint={{ x: 0, y: 0 }}
              fillLinearGradientEndPoint={{ x: 0, y: 110 }}
              fillLinearGradientColorStops={[
                0, 'rgba(0, 0, 0, 0.75)',
                0.6, 'rgba(0, 0, 0, 0.3)',
                1, 'rgba(0, 0, 0, 0)',
              ]}
            />

            {/* Deep bottom-up cinematic gradient */}
            <Rect
              x={0}
              y={140}
              width={W}
              height={260}
              fillLinearGradientStartPoint={{ x: 0, y: 0 }}
              fillLinearGradientEndPoint={{ x: 0, y: 260 }}
              fillLinearGradientColorStops={[
                0, 'rgba(0, 0, 0, 0)',
                0.3, 'rgba(0, 0, 0, 0.45)',
                0.68, 'rgba(0, 0, 0, 0.92)',
                1, 'rgba(0, 0, 0, 1)',
              ]}
            />

            {/* BRANDING LOGO (Top Center) */}
            {(() => {
              const logoHeight = 24;
              const logoWidth = logoImg ? (logoImg.width * (logoHeight / logoImg.height)) : 110;
              const logoX = (W - logoWidth) / 2;
              const logoY = 18;

              return logoImg ? (
                <Image
                  x={logoX}
                  y={logoY}
                  width={logoWidth}
                  height={logoHeight}
                  image={logoImg}
                  shadowColor="rgba(0, 0, 0, 0.4)"
                  shadowBlur={6}
                  shadowOffset={{ x: 0, y: 2 }}
                  shadowOpacity={0.35}
                />
              ) : (
                <Text
                  text="Runflix Entertainment"
                  x={0}
                  y={logoY}
                  width={W}
                  align="center"
                  fontFamily='"Outfit", "Inter", "Helvetica Neue", sans-serif'
                  fontSize={20}
                  fontStyle="900"
                  fill="#ef4444"
                  letterSpacing={4}
                  shadowColor="rgba(239, 68, 68, 0.3)"
                  shadowBlur={8}
                  shadowOffset={{ x: 0, y: 2 }}
                  shadowOpacity={0.6}
                />
              );
            })()}

            {/* DYNAMIC GLASSY BADGES (above title) */}
            {badges.map((badge, idx) => {
              const textWidth = badge.length * 5.2 + 14;
              const bX = badgePositions[idx];
              return (
                <React.Fragment key={idx}>
                  <Rect
                    x={bX}
                    y={215}
                    width={textWidth}
                    height={18}
                    cornerRadius={4}
                    fill={badge === 'TV SERIES' || badge.includes('SEASON') || badge === 'MOVIE'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(255, 255, 255, 0.08)'
                    }
                    stroke={badge === 'TV SERIES' || badge.includes('SEASON') || badge === 'MOVIE'
                      ? 'rgba(239, 68, 68, 0.25)'
                      : 'rgba(255, 255, 255, 0.12)'
                    }
                    strokeWidth={1}
                  />
                  <Text
                    text={badge}
                    x={bX}
                    y={220}
                    width={textWidth}
                    align="center"
                    fontFamily='"Outfit", "Inter", sans-serif'
                    fontSize={8}
                    fontStyle="bold"
                    fill={badge === 'TV SERIES' || badge.includes('SEASON') || badge === 'MOVIE'
                      ? '#f87171'
                      : 'rgba(255, 255, 255, 0.85)'
                    }
                  />
                </React.Fragment>
              );
            })}

            {/* MOVIE TITLE */}
            <Text
              text={title}
              x={24}
              y={240}
              width={532}
              height={50}
              verticalAlign="middle"
              fontFamily='"Outfit", "Inter", sans-serif'
              fontSize={getFontSize(title)}
              fontStyle="900"
              fill="#ffffff"
              wrap="word"
              lineHeight={1.05}
              shadowColor="black"
              shadowBlur={6}
              shadowOffset={{ x: 0, y: 2 }}
              shadowOpacity={0.8}
            />

            {/* MOVIE DESCRIPTION / SYNOPSIS */}
            {description && (
              <Text
                text={description}
                x={24}
                y={296}
                width={532}
                height={34}
                fontFamily='"Outfit", "Inter", sans-serif'
                fontSize={10}
                fontStyle="normal"
                fill="rgba(255, 255, 255, 0.6)"
                wrap="word"
                lineHeight={1.3}
                ellipsis={true}
                shadowColor="black"
                shadowBlur={2}
                shadowOffset={{ x: 0, y: 1 }}
                shadowOpacity={0.5}
              />
            )}

            {/* FOOTER SECTION */}
            {/* Play Circle background */}
            <Circle
              x={38}
              y={358}
              radius={14}
              fill="#ef4444"
              shadowColor="rgba(239, 68, 68, 0.4)"
              shadowBlur={8}
              shadowOffset={{ x: 0, y: 3 }}
              shadowOpacity={0.5}
            />
            {/* Play Vector Triangle */}
            <RegularPolygon
              x={39.5}
              y={358}
              sides={3}
              radius={6}
              fill="white"
              rotation={90}
            />

            {/* Watch Now and Domain */}
            <Text
              text="WATCH NOW"
              x={62}
              y={348}
              fontFamily='"Outfit", "Inter", sans-serif'
              fontSize={10}
              fontStyle="900"
              fill="#ffffff"
            />
            <Text
              text={siteDomain}
              x={62}
              y={360}
              fontFamily='"Outfit", "Inter", sans-serif'
              fontSize={8}
              fontStyle="bold"
              fill="rgba(255, 255, 255, 0.4)"
            />

            {/* IMDb Rating Badge */}
            {rating && (
              <>
                <Rect
                  x={qrImg ? 346 : 458}
                  y={347}
                  width={qrImg ? 90 : 98}
                  height={22}
                  cornerRadius={11}
                  fill="rgba(0, 0, 0, 0.45)"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth={1}
                />
                <Text
                  text={`★  ${rating} IMDb`}
                  x={qrImg ? 346 : 458}
                  y={353}
                  width={qrImg ? 90 : 98}
                  align="center"
                  fontFamily='"Outfit", "Inter", sans-serif'
                  fontSize={8.5}
                  fontStyle="900"
                  fill="#ffffff"
                  shadowColor="black"
                  shadowBlur={2}
                />
              </>
            )}

            {/* QR Code Glass Badge */}
            {qrImg && (
              <>
                <Rect
                  x={448}
                  y={341}
                  width={108}
                  height={34}
                  cornerRadius={8}
                  fill="rgba(255, 255, 255, 0.05)"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth={1}
                />
                <Image
                  x={452}
                  y={345}
                  width={26}
                  height={26}
                  image={qrImg}
                  cornerRadius={3}
                />
                <Text
                  text="SCAN"
                  x={486}
                  y={346}
                  fontFamily='"Outfit", "Inter", sans-serif'
                  fontSize={8}
                  fontStyle="900"
                  fill="#ffffff"
                />
                <Text
                  text="TO WATCH"
                  x={486}
                  y={356}
                  fontFamily='"Outfit", "Inter", sans-serif'
                  fontSize={6.5}
                  fontStyle="900"
                  fill="rgba(255, 255, 255, 0.4)"
                />
              </>
            )}
          </Layer>
        </Stage>
      </div>
    );
  }
);

CinematicPoster.displayName = 'CinematicPoster';
