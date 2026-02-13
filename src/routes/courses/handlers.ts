import type { Request, Response } from 'express'
import filtersToScopes from '../../scopes'
import handleErrors from '../../lib/apiErrorHandler'
import { setReadRegions } from '../../services/accessValidation'
import { getAllCourses, getCourseById as getById, createCourseByName as createCourse } from '../../services/course'
import { currentUserId } from '../../services/currentUser'
import getCachedResponse from '../../lib/cache'
import { getCourseUrlWidgetData } from '../../services/dashboards/course'
import { userById } from '../../services/users'
import UserPolicy from '../../policies/user'

const COURSE_DATA_CACHE_VERSION = 1.5

const namespace = 'HANDLERS:COURSES'
const logContext = {
  namespace,
}

export async function courseAuthorization(
  req: Request,
  res: Response,
  newCourse = false
): Promise<{
  course: {
    id: number
    update: (data: { mapsTo: number }) => Promise<void>
    destroy: () => Promise<void>
  } | null
  isAuthorized: boolean
}> {
  const userId = await currentUserId(req, res)
  const user = await userById(userId)
  const authorization = new UserPolicy(user)

  if (!authorization.isAdmin()) {
    res.status(403).send('Forbidden')
    return {
      course: null,
      isAuthorized: false,
    }
  }

  if (newCourse) {
    return {
      course: null,
      isAuthorized: true,
    }
  }

  const { id } = req.params

  const course = await getById(Number(id))
  if (!course) {
    res.status(404).send('Course not found')
    return {
      course: null,
      isAuthorized: false,
    }
  }

  return {
    course,
    isAuthorized: true,
  }
}

export async function allCourses(req: Request, res: Response) {
  try {
    // we only verify site access for getting all courses
    // (everyone with site access can see them, theoretically)
    const courses = await getAllCourses()
    res.json(courses)
  } catch (err) {
    await handleErrors(req, res, err, logContext)
  }
}

export async function getCourseById(req: Request, res: Response) {
  try {
    const { id } = req.params
    const course = await getById(Number(id))
    res.json(course)
  } catch (err) {
    await handleErrors(req, res, err, logContext)
  }
}

export async function updateCourseById(req: Request, res: Response) {
  try {
    const { isAuthorized, course } = await courseAuthorization(req, res)
    if (!isAuthorized) {
      return
    }

    const newCourse = await createCourse(req.body.name)

    await course.update({
      mapsTo: newCourse.id,
    })

    await course.destroy()

    res.json(newCourse)
  } catch (err) {
    await handleErrors(req, res, err, logContext)
  }
}

export async function createCourseByName(req: Request, res: Response) {
  try {
    const { isAuthorized } = await courseAuthorization(req, res, true)
    if (!isAuthorized) {
      return
    }

    const { name } = req.body
    const course = await createCourse(name)

    res.json(course)
  } catch (err) {
    await handleErrors(req, res, err, logContext)
  }
}

export async function deleteCourseById(req: Request, res: Response) {
  try {
    const { isAuthorized, course } = await courseAuthorization(req, res)
    if (!isAuthorized) {
      return
    }

    await course.destroy()

    res.status(204).send()
  } catch (err) {
    await handleErrors(req, res, err, logContext)
  }
}

export async function getCourseUrlWidgetDataWithCache(req: Request, res: Response) {
  const userId = await currentUserId(req, res)
  const query = await setReadRegions(req.query, userId)
  const key = `getCourseWidgetUrlData?v=${COURSE_DATA_CACHE_VERSION}&${JSON.stringify(query)}`

  const response = await getCachedResponse(
    key,
    async () => {
      const scopes = await filtersToScopes(query, {})
      const data = await getCourseUrlWidgetData(scopes)
      return JSON.stringify(data)
    },
    JSON.parse
  )

  res.json(response)
}
