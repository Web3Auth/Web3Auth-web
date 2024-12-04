import './index.css'
import { AppProvider } from './context';
import Main from './MainView';

import { useTranslation } from 'react-i18next';

function App() {
  return (
    <AppProvider>
      <Main/>
    </AppProvider>

  )
}

export default App
