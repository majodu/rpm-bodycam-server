import React, { useMemo, useState, useEffect } from "react";
import logo from "./logo.svg";
import Table from "./Table";
import "./App.css";
import CssBaseline from "@material-ui/core/CssBaseline";
import MaUTable from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";

function App() {
  const [data, setData] = useState([]);
  const [once, setOnce] = useState(false);
  const columns = useMemo(
    () => [
      {
        // first group - TV Show
        Header: "Basic Metadata",
        // First group columns
        columns: [
          {
            Header: "Hash Match",
            accessor: "hashMatch",
          },
          {
            Header: "Start Time",
            accessor: "startTime",
          },

          {
            Header: "Device ID",
            accessor: "deviceID",
          },
        ],
      },
      {
        // Second group - Details
        Header: "Advanced Metadata",
        // Second group columns
        columns: [
          {
            Header: "Hash",
            accessor: "hash",
          },
          {
            Header: "End Time",
            accessor: "endTime",
          },
          {
            Header: "Link",
            accessor: "path",
          },
        ],
      },
    ],
    []
  );

  if (!once) {
    setInterval(() => {
      fetch(`data`)
        .then((body) => {
          return body.json();
        })
        .then((body) => {
          console.log(body.metadata);
          setData(body.metadata);
        });
    }, 5000);
    setOnce(true);
  }
  data.map((entry) => {
    entry.startTime = new Date(entry.startTime).toLocaleString();
    entry.endTime = new Date(entry.endTime).toLocaleString();
    entry.recieveTime = new Date(entry.recieveTime).toLocaleString();
    // entry.isRecording = "🔴";

    if (entry.hashMatch) {
      entry.hashMatch = "✅";
    } else {
      entry.hashMatch = "❌";
    }
    if (entry.path !== "") {
      entry.path = <a href={entry.path}>Link</a>;
    }
  });
  return (
    <div className="App">
      <Table columns={columns} data={data} />
    </div>
  );
}

export default App;
