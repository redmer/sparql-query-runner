import { IJobSourceData } from "../config/types";
import { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types";

export class GeopackageSource implements WorkflowPart<IJobSourceData> {
  id = () => "sources/geopackage";

  async isQualified(data: IJobSourceData): Promise<boolean> {
    return data.access.endsWith(".gpkg"); // only support for geopackages
  }

  async info(data: IJobSourceData): Promise<(context: JobRuntimeContext) => WorkflowGetter> {
      return (context: JobRuntimeContext) => {
        return {
          data: 
        }
      }
  }
}
