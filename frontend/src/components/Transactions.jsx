// src/components/Transactions.jsx
import { useEffect, useState } from "react";
import axios from "axios";

function Transactions() {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/transactions/")
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        console.error("Error fetching transactions:", err);
      });
  }, []);

  return (
    <div>
      <h2 className="text-lg font-semibold">Transactions</h2>
      <ul>
        {data.map((txn) => (
          <li key={txn.id}>
            {txn.date} | {txn.description} | ₹{txn.amount}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Transactions;