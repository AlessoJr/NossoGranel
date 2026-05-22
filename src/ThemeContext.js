import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [temaEscuro, setTemaEscuro] = useState(true);

  useEffect(() => {
    const salvo = localStorage.getItem('tema');
    if (salvo !== null) {
      setTemaEscuro(salvo === 'escuro');
    }
  }, []);

  function alternarTema() {
    const novo = !temaEscuro;
    setTemaEscuro(novo);
    localStorage.setItem('tema', novo ? 'escuro' : 'claro');
  }

  return (
    <ThemeContext.Provider value={{ temaEscuro, alternarTema }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTema() {
  return useContext(ThemeContext);
}
