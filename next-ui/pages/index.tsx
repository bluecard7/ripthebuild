import Head from 'next/head'
import Image from 'next/image'
import { Fragment, useRef, useCallback, useEffect, useState } from 'react'
import { of, fromEvent } from 'rxjs'
import { filter, map, throttleTime } from 'rxjs/operators'
import styles from '../styles/Home.module.css'

const baseURL = 'http://localhost:8081'
const observeKeydown = () => fromEvent(document, 'keydown')
  .pipe(
    throttleTime(200),
    map(e => e.code),
    filter(Boolean),
  )
const urlify = (parts: string[]): string => parts.filter(Boolean).join('/')
const fetchData = (pieces: string[]): Promise<Response> => {
  console.log(urlify(pieces))
  return fetch(urlify(pieces))
    .then(data => data)
    .catch(err => ({ text: () => err.message }))
}

async function loadPage(
  order: string = "", 
  hash: string = "", 
  path: string = "",
): Promise<string[]> {
  const res = await fetchData([baseURL, 'commits', order, hash, path])
  return res.ok ? (await res.json()) : []
}

// todo: file renames result in both versions being appended w/ =>
// handle in backend
async function loadDiff(
  hash: string = "", 
  path: string = ""
): Promise<{ diff: string[], pathMenu: string[]}> {
  const res = await fetchData([baseURL,'diffs', hash, path])
  return res.json()
}

function useCommits() {
  const hashes = useRef([])
  const [hashPos, setHashPos] = useState(-1)
  const hashPosRef = useRef(-1)
  
  const menu = useRef([])
  const [diff, setDiff] = useState([])
  
  const [pagePath, setPagePath] = useState("")
  const [readPath, setReadPath] = useState("")
  
  const flip = (order: string): Promise<string[]> => {
    const hash = hashes.current[hashPosRef.current]
    return loadPage(order, hash, pagePath)
  }
  const updateHashPos = (pos: number) => {
    hashPosRef.current = pos
    setHashPos(pos)
  }
  const prepend = (page: string[]) => {
    hashes.current = page.concat(hashes.current)
    updateHashPos(page.length - 1)
  }
  const append = (page: string[]) => {
    hashes.current = hashes.current.concat(page)  
    updateHashPos(hashPosRef.current + 1)
  }
 
  useEffect(() => {
    flip("next").then(append)
    const subscription = observeKeydown().subscribe(code => {
      const currHashPos = hashPosRef.current;
      if (code === 'ArrowLeft') {
        if (currHashPos === 0) {
          flip("prev").then(prepend)
        } else {
          updateHashPos(currHashPos - 1) 
        }
      }
      if (code === 'ArrowRight') {
        if (currHashPos === hashes.current.length - 1) {
          flip("next").then(append)
        } else {
          updateHashPos(currHashPos + 1) 
        }
      }
      // always reset for now, but not if there's a pagePath?
      setReadPath("")
    });
    return subscription?.unsubscribe
  }, [])
  
  useEffect(() => {
    // pagePath && ...push onto traversal stack?
    console.log("page path set, i would do something")
  }, [pagePath])

  useEffect(() => {
    const hash = hashes.current[hashPosRef.current]
    hash && loadDiff(hash, readPath).then(res => {
        menu.current = res.pathMenu || []
        setDiff(res.diff)
    })
  }, [hashPos, readPath])

  return {
    menu: menu.current,
    diff,
    readPath,
    setReadPath,
    setPagePath,
  }
}

// todo: push + start new traversal if pagePath set
// todo: one col for name, one col for diff stat
//  - aka better formatting
// todo: menu - copy filesystem view from github?
// todo: transition between commits + diffs are too jumpy
//  - css grid?
export default function Frame() {
  const { diff, menu, readPath, setReadPath, setPagePath } = useCommits();
  const clickCount = useRef(0)
  
  const rowStyle = (line: string): object => {
    switch (line[0]) {
      case "+": return { background: "#99ff99" }
      case "-": return { background: "#ff9999" }
    } 
    return {}
  }

  const buttonStyle = (path: string): object => {
    const base = { 
      border: '1px solid',  
      background: '#fff',
      margin: 5,
      padding: 10,
    }

    let clickedColor = '#95a9bf'
    switch(clickCount.current) {
      case 1: clickedColor = '#b3cde0'; break
      case 2: clickedColor = '#e3e6ff'
    }

    return path === readPath 
      ? { ...base, background: clickedColor } 
      : base ;
  }
  
  const resetPaths = () => {
    setReadPath("")
    setPagePath("")
  }
  
  const selectPath = (path: string) => {
    if (clickCount.current === 0 || path !== readPath) {
      setReadPath(path)
      clickCount.current = 1
      return
    }
    if (clickCount.current === 1) {
      setPagePath(path)
      clickCount.current = 2
      return
    }
    if (clickCount.current === 2) {
      resetPaths()
      clickCount.current = 0
    }
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>ripthebuild</title>
      </Head>
      <main className={styles.main}>
        <div className={styles.container}>
          {menu.map((path, pos) => (
            <button key={path}
              style={buttonStyle(path)}
              onClick={() => selectPath(path)} 
            >
              {path}
            </button>
          ))}
        </div>
        <table>
          <tbody>
            {diff.map(line => (
              <tr style={rowStyle(line)}>
                {line}
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  )
}
