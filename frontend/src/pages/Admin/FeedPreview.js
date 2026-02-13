import React, { useState, useRef } from 'react'
import { ButtonGroup, Button, Form, FormGroup, Label, TextInput } from '@trussworks/react-uswds'
import ContentFromFeedByTag from '../../components/ContentFromFeedByTag'
import Container from '../../components/Container'
import DrawerTriggerButton from '../../components/DrawerTriggerButton'
import Drawer from '../../components/Drawer'

export default function FeedPreview() {
  const [title, setTitle] = useState('')
  const [tag, setTag] = useState('')
  const [contentSelector, setContentSelector] = useState('')
  const [cssClass, setCssClass] = useState('')
  const drawerTriggerRef = useRef(null)

  const onSubmit = (e) => {
    e.preventDefault()
    const data = new FormData(e.target)
    setTitle(data.get('title'))
    setTag(data.get('tag'))
    setContentSelector(data.get('contentSelector'))
    setCssClass(data.get('cssClass'))
  }

  const onReset = () => {
    setTitle('')
    setTag('')
    setContentSelector('')
    setCssClass('')
  }

  return (
    <Container>
      <h1>Preview confluence RSS feed</h1>{' '}
      {tag && (
        <>
          <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>Preview drawer</DrawerTriggerButton>
          <Drawer triggerRef={drawerTriggerRef} stickyHeader stickyFooter title={title}>
            <ContentFromFeedByTag className={cssClass} tagName={tag} contentSelector={contentSelector} />
          </Drawer>
        </>
      )}
      <Form onSubmit={onSubmit} className="margin-bottom-2">
        <details>
          <summary> More info</summary>
          <p className="usa-prose">
            The CSS class is used to style the feed preview by the engineers. The option to add it here is so that you can preview changes to existing
            feeds. (It won&apos;t do anything unless an engineer has already added corresponding styles.)
          </p>
        </details>
        <FormGroup>
          <Label htmlFor="title" required>
            Title
          </Label>
          <TextInput id="title" name="title" type="text" required />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="tag" required>
            Tag
          </Label>
          <TextInput id="tag" name="tag" type="text" required />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="contentSelector">Content selector</Label>
          <TextInput id="contentSelector" name="contentSelector" type="text" />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="cssClass">CSS class</Label>
          <TextInput id="cssClass" name="cssClass" type="text" />
        </FormGroup>
        <ButtonGroup>
          <Button type="submit">Save changes</Button>
          <Button type="reset" onClick={onReset} outline>
            Reset
          </Button>
        </ButtonGroup>
      </Form>
      <hr />
      <table className="usa-table">
        <caption>Existing drawer configuration</caption>
        <thead>
          <tr>
            <th>Drawer title</th>
            <th>Tag</th>
            <th>Content selector</th>
            <th>CSS class</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Support type</td>
            <td>ttahub-tta-support-type</td>
            <td>table</td>
            <td>ttahub-drawer--objective-support-type-guidance</td>
          </tr>
          <tr>
            <td>Objective topics</td>
            <td>ttahub-topic</td>
            <td>table</td>
            <td>ttahub-drawer--objective-topics-guidance</td>
          </tr>
          <tr>
            <td>Class review first section</td>
            <td>ttahub-class-thresholds</td>
            <td>div:nth-child(3)</td>
            <td>ttahub-class-feed-article</td>
          </tr>
          <tr>
            <td>Class review second section</td>
            <td>ttahub-class-thresholds</td>
            <td>div:nth-child(4)</td>
            <td>ttahub-class-feed-article</td>
          </tr>
        </tbody>
      </table>
    </Container>
  )
}
