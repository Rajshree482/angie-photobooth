import { createContext, useContext, useMemo, useState } from 'react';

const PhotoboothContext = createContext(null);

export function PhotoboothProvider({ children }) {
  const [name, setName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [shots, setShots] = useState([]); // array of 4 dataURLs, unfiltered
  const [filterId, setFilterId] = useState('original');

  const value = useMemo(
    () => ({
      name,
      setName,
      partnerName,
      setPartnerName,
      roomId,
      setRoomId,
      isHost,
      setIsHost,
      shots,
      setShots,
      filterId,
      setFilterId,
      reset() {
        setShots([]);
        setFilterId('original');
      },
    }),
    [name, partnerName, roomId, isHost, shots, filterId]
  );

  return <PhotoboothContext.Provider value={value}>{children}</PhotoboothContext.Provider>;
}

export function usePhotobooth() {
  const ctx = useContext(PhotoboothContext);
  if (!ctx) throw new Error('usePhotobooth must be used inside PhotoboothProvider');
  return ctx;
}
