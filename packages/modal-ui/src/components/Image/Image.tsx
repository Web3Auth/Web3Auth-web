import { useContext } from "solid-js";

import { mergeProps } from "solid-js";
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
}

export default function Image(props: ImageProps) {
  const mergedProps = mergeProps({
    isButton: false,
    height: "auto",
    width: "auto",
    extension: "svg"
  }, props)

  const { isDark } = useContext(ThemedContext);

  const imgName = isDark && mergedProps.darkImageId ? mergedProps.darkImageId : mergedProps.imageId;
  const hoverImgName = isDark && mergedProps.darkHoverImageId ? mergedProps.darkHoverImageId : mergedProps.hoverImageId;

  return (
    <>
      <img
        src={`https://images.web3auth.io/${imgName}.${mergedProps.extension}`}
        height={mergedProps.height}
        width={mergedProps.width}
        alt={mergedProps.imageId}
        class="w3a--object-contain w3a--rounded"
        onError={({ currentTarget }) => {
          if (mergedProps.fallbackImageId) {
            // eslint-disable-next-line no-param-reassign
            currentTarget.onerror = null; // prevents looping
            // eslint-disable-next-line no-param-reassign
            currentTarget.src = `https://images.web3auth.io/${mergedProps.fallbackImageId}.svg`;
          }
        }}
      />
      {mergedProps.isButton ? (
        <img
          src={`https://images.web3auth.io/${hoverImgName}.${mergedProps.extension}`}
          height={mergedProps.height}
          width={mergedProps.width}
          alt={mergedProps.hoverImageId}
          class="w3a--object-contain w3a--rounded"
        />
      ) : null}
    </>
  );
}
