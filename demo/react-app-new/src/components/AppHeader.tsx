import React, { useEffect, useState } from 'react';
import { useWeb3Auth } from "@web3auth/modal-react-hooks";
import { useTranslation } from 'react-i18next';
import { Button } from '@toruslabs/react-components';

const AppHeader: React.FC = () => {
  const { t } = useTranslation();
  const { status, logout, isConnected } = useWeb3Auth();

  const [isDisplay, setIsDisplay] = useState({
    btnLogout: false,
    appHeading: false,
  });

  useEffect(() => {
    setIsDisplay({
      btnLogout: isConnected,
      appHeading: isConnected,
    });
  }, [status, isConnected]);

  const onLogout = async () => {
    await logout();
  }

  return (
    <nav className="bg-white sticky top-0 z-50 w-full z-20 top-0 start-0 border-gray-200 dark:border-gray-600">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <a href="#" className="flex items-center space-x-3 rtl:space-x-reverse">
          <img src="/web3auth.svg" className="h-8" alt="W3A Logo" />
        </a>
        <div className="flex space-x-3 rtl:space-x-reverse">
          {isDisplay.btnLogout ? (
            <Button onClick={onLogout} pill size="sm">
              {t('app.btnLogout')}
            </Button>
          ) : (
            <Button onClick={()=>{}} pill block size="sm" variant="secondary">
              {t('app.documentation')}
            </Button>
          )}
        </div>
        <div id="navbar-sticky" className="items-center justify-between w-full">
          {isDisplay.appHeading && (
            <div className="max-sm:w-full">
              <h1 className="leading-tight text-3xl font-extrabold">{t('app.title')}</h1>
              <p className="leading-tight text-1xl">{t('app.description')}</p>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default AppHeader;