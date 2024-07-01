import "./App.css"

const URLS = [
  "https://www.olvi.fi",
  "https://www.yeppo.fi",
  "https://viataito.com",
]

function App() {
  return (
    <>
      <h1>hello!</h1>
      {URLS.map((url) => (
        <img
          key={url}
          src={`http://localhost:3000/logo?url=${encodeURIComponent(url)}`}
        />
      ))}
    </>
  )
}

export default App
