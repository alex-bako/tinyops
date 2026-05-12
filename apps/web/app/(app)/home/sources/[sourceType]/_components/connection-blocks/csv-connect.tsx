import { DownloadIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Form, FormRow } from "@workspace/ui/components/form-row"

import { Dropzone } from "../dropzone"
import { FileRow } from "../file-row"

function CsvConnect() {
  return (
    <Form>
      <FormRow label="Current file">
        <FileRow name="march-cohort.csv" meta="142 rows · uploaded 3d ago">
          <Button type="button" variant="ghost" size="sm">
            <DownloadIcon />
            Download
          </Button>
        </FileRow>
      </FormRow>
      <FormRow label="Replace with">
        <Dropzone />
      </FormRow>
    </Form>
  )
}

export { CsvConnect }
