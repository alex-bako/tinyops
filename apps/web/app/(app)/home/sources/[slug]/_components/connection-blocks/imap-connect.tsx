"use client"

import * as React from "react"

import { Form, FormRow } from "@workspace/ui/components/form-row"
import { Input } from "@workspace/ui/components/input"

import { SegmentedControl } from "../segmented-control"
import { StatusDot } from "../status-dot"

function ImapConnect() {
  const [server, setServer] = React.useState("imap.fastmail.com")
  const [port, setPort] = React.useState("993")
  const [username, setUsername] = React.useState("hello@yourpractice.com")
  const [password, setPassword] = React.useState("••••••••••••")

  return (
    <Form>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow label="Server" className="sm:grid-cols-[100px_minmax(0,1fr)]">
          <Input
            value={server}
            onChange={(event) => setServer(event.target.value)}
            className="font-mono text-[12.5px]"
          />
        </FormRow>
        <FormRow label="Port" className="sm:grid-cols-[100px_minmax(0,1fr)]">
          <Input
            value={port}
            onChange={(event) => setPort(event.target.value)}
            className="font-mono text-[12.5px]"
          />
        </FormRow>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow label="Username" className="sm:grid-cols-[100px_minmax(0,1fr)]">
          <Input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="font-mono text-[12.5px]"
          />
        </FormRow>
        <FormRow
          label="App password"
          className="sm:grid-cols-[100px_minmax(0,1fr)]"
        >
          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="font-mono text-[12.5px]"
          />
        </FormRow>
      </div>
      <FormRow label="Encryption">
        <SegmentedControl
          ariaLabel="Encryption"
          defaultValue="ssl"
          options={[
            { value: "ssl", label: "SSL/TLS" },
            { value: "starttls", label: "STARTTLS" },
            { value: "none", label: "None" },
          ]}
        />
      </FormRow>
      <FormRow label="Status">
        <StatusDot
          status={{
            variant: "ok",
            label: "Connected · 3 folders watched",
          }}
        />
      </FormRow>
    </Form>
  )
}

export { ImapConnect }
