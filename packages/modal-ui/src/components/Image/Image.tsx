import { createMemo, mergeProps, Show, useContext } from "solid-js";

import { ThemedContext } from "../../context/ThemeContext";

export interface ImageProps {
  hoverImageId?: string;
  imageId: string;
  isButton?: boolean;
  height?: string;
  width?: string;
  fallbackImageId?: string;
  extension?: string;
  darkImageId?: string;
  darkHoverImageId?: string;
  class?: string;
}

export default function Image(props: ImageProps) {
  const mergedProps = mergeProps(
    {
      isButton: false,
      height: "auto",
      width: "auto",
      extension: "svg",
    },
    props
  );

  const { isDark } = useContext(ThemedContext);

  const imgName = createMemo(() => (isDark && mergedProps.darkImageId ? mergedProps.darkImageId : mergedProps.imageId));
  const hoverImgName = createMemo(() => (isDark && mergedProps.darkHoverImageId ? mergedProps.darkHoverImageId : mergedProps.hoverImageId));

  return (
    <>
      <Show
        when={mergedProps.isButton}
        fallback={
          <img
            src={`https://images.web3auth.io/${imgName()}.${mergedProps.extension}`}
            height={mergedProps.height}
            width={mergedProps.width}
            alt={mergedProps.imageId}
            class="w3a--object-contain w3a--rounded"
            onError={({ currentTarget }) => {
              if (mergedProps.fallbackImageId) {
                currentTarget.onerror = null; // prevents looping

                currentTarget.src = `https://images.web3auth.io/${mergedProps.fallbackImageId}.svg`;
              }
            }}
          />
        }
      >
        <img
          src={`https://images.web3auth.io/${hoverImgName()}.${mergedProps.extension}`}
          height={mergedProps.height}
          width={mergedProps.width}
          alt={mergedProps.hoverImageId}
          class={`w3a--object-contain w3a--rounded ${mergedProps.class}`}
        />
      </Show>
    </>
  );
}
