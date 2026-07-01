import { Route, Routes } from 'react-router-dom';
import { PhotoboothProvider } from './context/PhotoboothContext.jsx';
import Landing from './pages/Landing.jsx';
import Photobooth from './pages/Photobooth.jsx';
import Filters from './pages/Filters.jsx';
import Result from './pages/Result.jsx';

export default function App() {
  return (
    <PhotoboothProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/photobooth" element={<Photobooth />} />
        <Route path="/filters" element={<Filters />} />
        <Route path="/result" element={<Result />} />
      </Routes>
    </PhotoboothProvider>
  );
}
