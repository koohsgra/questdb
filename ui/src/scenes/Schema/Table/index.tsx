/*******************************************************************************
 *     ___                  _   ____  ____
 *    / _ \ _   _  ___  ___| |_|  _ \| __ )
 *   | | | | | | |/ _ \/ __| __| | | |  _ \
 *   | |_| | |_| |  __/\__ \ |_| |_| | |_) |
 *    \__\_\\__,_|\___||___/\__|____/|____/
 *
 *  Copyright (c) 2014-2019 Appsicle
 *  Copyright (c) 2019-2022 QuestDB
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 ******************************************************************************/

import React, { useCallback, useEffect, useState, useRef } from "react"
import { CSSTransition } from "react-transition-group"
import { from, combineLatest, of } from "rxjs"
import { delay, startWith } from "rxjs/operators"
import styled from "styled-components"
import { Loader4 } from "@styled-icons/remix-line/Loader4"
import {
  Tree,
  TreeInterface,
  collapseTransition,
  spinAnimation,
  TransitionDuration,
} from "components"
import { ContextMenuTrigger } from "components/ContextMenu"
import { color } from "utils"
import * as QuestDB from "utils/questdb"
import Row from "../Row"
import ContextualMenu from "./ContextualMenu"

type Props = QuestDB.Table &
  Readonly<{
    designatedTimestamp: string
    expanded: boolean
    description?: string
    isScrolling: boolean
    onChange: (table: string) => void
    refresh: number
    name: string
    partitionBy: string
  }>

const Wrapper = styled.div`
  position: relative;
  display: flex;
  margin-top: 0.5rem;
  align-items: stretch;
  flex-direction: column;
  overflow: hidden;

  ${collapseTransition};
`

const Title = styled(Row)`
  display: flex;
  align-items: stretch;
  font-weight: ${({ expanded }) => (expanded ? 800 : 400)};

  &:hover {
    cursor: pointer;
  }
`

const Columns = styled.div`
  position: relative;
  display: flex;
  margin-left: 3rem;
  flex-direction: column;

  &:before {
    position: absolute;
    height: 100%;
    width: 2px;
    left: -1.2rem;
    top: 0;
    content: "";
    background: ${color("gray1")};
  }
`

const Loader = styled(Loader4)`
  margin-left: 1rem;
  color: ${color("draculaOrange")};
  ${spinAnimation};
`

// for demoing async loading
const wait = async (ms: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, ms))

const Table = ({
  description,
  expanded,
  isScrolling,
  onChange,
  refresh,
  designatedTimestamp,
  name,
  partitionBy,
}: Props) => {
  const ref = useRef<HTMLDivElement>(null)
  const [quest] = useState(new QuestDB.Client())
  const [loading, setLoading] = useState(false)
  const [columns, setColumns] = useState<QuestDB.Column[]>()

  useEffect(() => {
    if (expanded) {
      combineLatest(
        from(quest.showColumns(name)).pipe(startWith(null)),
        of(true).pipe(delay(1000), startWith(false)),
      ).subscribe(([response, loading]) => {
        if (response && response.type === QuestDB.Type.DQL) {
          setColumns(response.data)
          setLoading(false)
        } else {
          setLoading(loading)
        }
      })
    }
  }, [expanded, refresh, quest, name])

  const onLeafOpen = useCallback(async (payload: unknown): Promise<
    TreeInterface[]
  > => {
    // quest.showColumns(name)
    // depending on payload type call related endpoint
    await wait(1000)
    return [{ name: `children of ${name}`, payload: [] }]
  }, [])

  const handleClick = useCallback(
    (e) => {
      onChange(expanded ? "" : name)
    },
    [expanded, onChange, name],
  )

  return (
    <Wrapper _height={columns ? columns.length * 30 : 0} ref={ref}>
      <ContextMenuTrigger id={name}>
        <Title
          description={description}
          expanded={expanded}
          kind="table"
          name={name}
          onClick={handleClick}
          partitionBy={partitionBy}
          suffix={loading && <Loader size="18px" />}
          tooltip={!!description}
        />
      </ContextMenuTrigger>

      {!isScrolling && <ContextualMenu name={name} partitionBy={partitionBy} />}

      <CSSTransition
        classNames="collapse"
        in={expanded}
        timeout={TransitionDuration.REG}
        unmountOnExit
      >
        <Columns>
          <Tree
            onLeafOpen={onLeafOpen}
            root={(columns ?? []).map((column) => ({
              name: column.column,
              payload: column,
            }))}
          />

          {columns?.map((column) => (
            <Row
              {...column}
              designatedTimestamp={designatedTimestamp}
              key={`${column.column}-${column.type}${
                column.indexed ? "-i" : ""
              }`}
              kind="column"
              name={column.column}
            />
          ))}
        </Columns>
      </CSSTransition>
    </Wrapper>
  )
}

export default Table
