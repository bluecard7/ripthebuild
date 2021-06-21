import Head from 'next/head'
import Image from 'next/image'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { useSpring, animated } from 'react-spring'
import styles from '../styles/Home.module.css'

function useAPI() {
  const [hashes, setHashes] = useState([])
  const [diff, setDiff] = useState("")
  const baseURL = 'http://localhost:8081'

  async function loadHashes(order: string, hash: string): [] {
    const data = await (
      fetch(`${baseURL}/commits/${order}/${hash}`)
        .then(data => data)
        .catch(err => ({ text: () => err.message }))
    )
    const page = data.ok && await data.json()
    data.ok && setHashes(page)
    return page || []
  }

  // if TypeError, abort all requests after?
  async function loadDiff(hash: string, filename: string): string {
    // if caching, return if already requested
    const data = await (
        fetch(`${baseURL}/diffs/${hash}/${filename}`)
        .then(data => data)
        .catch(err => ({ text: () => err.message }))
    )
    // await data.json()?
    const text = (await data.text()).trim();
    // if (data.ok) { 
    //  todo: cache texts + avoid requests
    // }
    setDiff(text)
    return text
  }
  return { 
    data: { hashes, diff },
    load: { 
      hashes: loadHashes, 
      diff: loadDiff, 
    }
  };
}

function FrameMenu({ hash, diff, load }) {
  const formatMenu = () => {
    return diff.split('\n')
      .map(line => line.split('|'))
      .map(parts => parts.length === 2 && parts[0].trim())
      .map(filename => filename && (
        <button onClick={() => load.diff(hash, filename)}>
          {filename}
        </button>
      ))
  }
  const [menu, setMenu] = useState(formatMenu())

  useEffect(() => { setMenu(formatMenu) }, [hash])

  return (
    <Fragment>
      {menu}
    </Fragment>
  )
}

const PAGE_SIZE = 10
function Frame() {
  const { data, load } = useAPI()
  // as in pos in data.hashes
  const [pos, setPos] = useState(PAGE_SIZE)

  const fadeStyle = useSpring({
    from: { opacity: 0.3 },
    to: { opacity: 1 },
    config: { 
      mass: 1, 
      tension: 280, 
      friction: 120,
      frequency: 2,
    },
    reset: true,
  })

  useEffect(() => {
    async function handleKey({ code }) {
      if (code === 'ArrowLeft') {
        setPos(prevPos => prevPos - 1)
      }
      if (code === 'ArrowRight') {
        setPos(prevPos => prevPos + 1)
      }
    }
    window?.addEventListener('keydown', handleKey)
    return() => window?.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    console.log("[pos]", pos, data.hashes)
    let pagePromise: Promise<string[]>;
    if (!data.hashes.length) {
      pagePromise = load.hashes('next', '')
    }
    if (pos < 0) {
      pagePromise = load.hashes('prev', data.hashes[0])
      setPos(PAGE_SIZE - 1)
    }
    if (pos === PAGE_SIZE) {
      pagePromise = load.hashes('next', data.hashes[PAGE_SIZE - 1])
      // caching would remove the second request I think will happen b/c of this line
      setPos(0)
    }
    pagePromise?.then(hashes => load.diff(hashes[pos] || '', ''))
    !pagePromise && load.diff(data.hashes[pos] || '', '')
  }, [pos, data.hashes])

  // ------- menu ---------
  // doesn't update to the current hash for some reason
  // just calling formatMenu for now
  const formatMenu = () => {
    return data.diff.split('\n')
      .map(line => line.split('|'))
      .map(parts => parts.length === 2 && parts[0].trim())
      .map(filename => filename && (
        <button onClick={() => load.diff(data.hashes[pos], filename)}>
          {filename}
        </button>
      ))
  }
  const [menu, setMenu] = useState(formatMenu())

  useEffect(() => { setMenu(formatMenu) }, [data.hashes, pos])
  // ------- menu ---------

  const lines = data.diff.split('\n')
  // rows and cols padded to avoid scrolling + wrapping
  const dims = {
    rows: lines.length + 1,
    cols: Math.max(...lines.map(line => line.length)) + 5,
  }

  return (
    <Fragment>
      <animated.textarea 
        style={fadeStyle} 
        {...dims}
        value={data.diff} 
        readOnly 
      />
      {/* Assumes --stat view is shown first */}
      {formatMenu()}
    </Fragment>
  )
}

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <Frame />
      </main>
    </div>
  )
}
