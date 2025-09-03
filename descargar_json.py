import requests
import datetime
import os
import json

# Crear carpeta si no existe
output_folder = "datos_actualizados"
os.makedirs(output_folder, exist_ok=True)

# URLs de los archivos
urls = {
    "ItemTemplates": "https://storage.googleapis.com/nacleanopenworldprodshards/ItemTemplates_cleanopenworldprodeu2.json",
    "Shops": "https://storage.googleapis.com/nacleanopenworldprodshards/Shops_cleanopenworldprodeu2.json",
    "Ports": "https://storage.googleapis.com/nacleanopenworldprodshards/Ports_cleanopenworldprodeu2.json",
    "Nations": "https://storage.googleapis.com/nacleanopenworldprodshards/Nations_cleanopenworldprodeu1.json"
}

# Descargar y limpiar cada archivo
for name, url in urls.items():
    response = requests.get(url)
    if response.status_code == 200:
        raw_text = response.text.strip()

        # Eliminar encabezado "var Nombre = " y el punto y coma final
        prefix = f"var {name} = "
        if raw_text.startswith(prefix):
            raw_text = raw_text[len(prefix):]
        if raw_text.endswith(";"):
            raw_text = raw_text[:-1]

        try:
            data = json.loads(raw_text)
            filename = f"{name}_{datetime.date.today()}.json"
            with open(os.path.join(output_folder, filename), "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"{name} descargado y limpiado correctamente.")
        except json.JSONDecodeError as e:
            print(f"Error al procesar {name}: {e}")
    else:
        print(f"Error al descargar {name}: {response.status_code}")

# Generar archivo ports.js con los datos limpios
ports_filename = f"Ports_{datetime.date.today()}.json"
ports_path = os.path.join(output_folder, ports_filename)

try:
    with open(ports_path, "r", encoding="utf-8") as f:
        ports_data = json.load(f)

    with open("mi-mapa/ports.js", "w", encoding="utf-8") as f:
        f.write("const ports = ")
        json.dump(ports_data, f, ensure_ascii=False, indent=2)
        f.write(";")
    print("Archivo ports.js generado correctamente.")
except Exception as e:
    print(f"Error al generar ports.js: {e}")
