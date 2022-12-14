export interface IStorageEntity {

}

export interface IStorageServiceResult {

}

export interface IStorageService {
    upload(entity: IStorageEntity): Promise<IStorageServiceResult>;
}