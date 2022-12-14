import { IStorageEntity, IStorageService, IStorageServiceResult } from "./iStorageService";

export abstract class StorageService implements IStorageService {

    public abstract upload(entity: IStorageEntity): Promise<IStorageServiceResult>;

    protected abstract init();
}