/**
 * Template download functions for flashcard bulk import.
 * Generates CSV and JSON template files.
 */

export function downloadCsvTemplate() {
  const csv = `front,back,keyword_name\n"Que es la mitocondria?","Organelo que produce energia (ATP) mediante respiracion celular","Mitocondria"\n"Que es un ribosoma?","Estructura que sintetiza proteinas a partir del ARN mensajero","Ribosoma"\n"Funcion del nucleo","Contiene el ADN y controla las funciones celulares","Nucleo"`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flashcards_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJsonTemplate() {
  const data = [
    { front: "Que es la mitocondria?", back: "Organelo que produce energia (ATP) mediante respiracion celular", keyword_name: "Mitocondria" },
    { front: "Que es un ribosoma?", back: "Estructura que sintetiza proteinas a partir del ARN mensajero", keyword_name: "Ribosoma" },
    { front: "Funcion del nucleo", back: "Contiene el ADN y controla las funciones celulares", keyword_name: "Nucleo" },
  ];
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flashcards_template.json';
  a.click();
  URL.revokeObjectURL(url);
}
