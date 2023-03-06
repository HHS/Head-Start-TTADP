export interface Filters {
  region: string;
}

export interface QueryOptions {
  userId: number;

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
