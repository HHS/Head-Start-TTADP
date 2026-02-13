import React, { useCallback, useEffect, useState } from 'react'
import { Button, Grid, GridContainer } from '@trussworks/react-uswds'
import CsvImport from './components/CsvImport'
import { getCourses } from '../../fetchers/courses'
import Container from '../../components/Container'
import CourseList from './CourseList'
import CourseAdd from './CourseAdd'

function Courses() {
  const [courses, setCourses] = useState()
  const primaryIdColumn = 'course name'
  const typeName = 'courses'
  const apiPathName = 'courses'

  const refresh = useCallback(async () => {
    const response = await getCourses()
    setCourses(response)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const exportCourses = () => {
    // export courses as CSV
    let csv = 'course name\n'
    courses.forEach((course) => {
      csv += `"${course.name}"\n`
    })

    const hiddenElement = document.createElement('a')
    hiddenElement.href = `data:text/csv;charset=utf-8,${encodeURI(csv)}`
    hiddenElement.target = '_blank'
    hiddenElement.download = 'courses.csv'
    hiddenElement.click()

    // cleanup el
    hiddenElement.remove()
  }

  const validCsvHeaders = ['course name']

  const requiredCsvHeaders = ['course name']

  return (
    <>
      <GridContainer className="margin-0 padding-0">
        <Grid row gap="lg">
          <Grid tablet={{ col: 6 }}>
            <Container>
              <CourseList courses={courses} />
            </Container>
          </Grid>
          <Grid tablet={{ col: 6 }}>
            <Container>
              <CourseAdd refresh={refresh} />
            </Container>
            <Container>
              <CsvImport
                validCsvHeaders={validCsvHeaders}
                requiredCsvHeaders={requiredCsvHeaders}
                typeName={typeName}
                apiPathName={apiPathName}
                primaryIdColumn={primaryIdColumn}
              />
            </Container>
            {courses && (
              <Container>
                <Button outline type="button" onClick={exportCourses}>
                  Export courses as CSV
                </Button>
              </Container>
            )}
          </Grid>
        </Grid>
      </GridContainer>
    </>
  )
}
export default Courses
