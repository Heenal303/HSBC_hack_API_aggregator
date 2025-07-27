// src/components/UploadCSV.jsx
import { useState } from "react";
import axios from "axios";

function UploadCSV() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://127.0.0.1:8000/api/transactions/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setMessage(res.data.message || "Upload successful");
    } catch (err) {
      console.error(err);
      setMessage("Upload failed");
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold">Upload CSV</h2>
      <form onSubmit={handleUpload}>
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} />
        <button type="submit">Upload</button>
      </form>
      <p>{message}</p>
    </div>
  );
}

export default UploadCSV;