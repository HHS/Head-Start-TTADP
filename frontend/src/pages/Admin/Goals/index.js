import React from 'react'
import { SideNav } from '@trussworks/react-uswds'
import { Link, Switch, Route } from 'react-router-dom'
import Create from './Create'
import Close from './Close'

const sideNavMenuItems = [<Link to="/admin/goals/create">Create</Link>, <Link to="/admin/goals/close">Close</Link>]

export default function Goals() {
  return (
    <div className="ttahub-grid__container ttahub-grid__container--gap-1">
      <nav className="ttahub-grid__nav">
        <SideNav items={sideNavMenuItems} />
      </nav>
      <div className="ttahub-grid__content">
        <Switch>
          <Route path="/admin/goals/create" render={() => <Create />} />
          <Route path="/admin/goals/close" render={() => <Close />} />
          <Route>
            <div>
              <p className="usa-prose">A selection is in order</p>
            </div>
          </Route>
        </Switch>
      </div>
    </div>
  )
}
