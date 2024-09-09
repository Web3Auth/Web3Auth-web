import Icon from "../Icon";

interface ExternalWalletHeaderProps {
  title: string;
  goBack: () => void;
  disableBackButton?: boolean;
  closeModal: () => void;
}

export default function ExternalWalletHeader(props: ExternalWalletHeaderProps) {
  const { title, goBack, closeModal, disableBackButton } = props;

  return (
    <div className="flex flex-row justify-center items-center pt-6 gap-1">
      <div className="flex flex-grow-1 flex-shrink-0 items-center justify-start mr-auto">
        {!disableBackButton && (
          <button type="button" className="w3a-external-back w3ajs-external-back" onClick={goBack}>
            <Icon iconName="arrow-left" />
          </button>
        )}
      </div>
      <div className="w3a-header__title flex-grow-0 flex-shrink truncate">{title}</div>
      <div className="flex flex-grow-1 flex-shrink-0 items-center justify-end ml-auto">
        <button type="button" onClick={closeModal} className="w3a-header__button w3ajs-close-btn">
          <Icon iconName="close" />
        </button>
      </div>
    </div>
  );
}
