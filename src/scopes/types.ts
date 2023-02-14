export interface Filters {
  region: string;
}

export interface QueryOptions {
  userId: string;

  activityReport: {
    subset: boolean;
  }
  grant?: {
    subset: boolean;
  }
  goal: {
    subset: boolean;
  }
}
