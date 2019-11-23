import { MongoClient, ObjectID } from "mongodb";
import { GraphQLServer } from "graphql-yoga";

import "babel-polyfill";

//"mongodb+srv://sergio:123pez@cluster0-dikpx.gcp.mongodb.net/test?retryWrites=true&w=majority"

const usr = "sergio";
const pwd = "123pez";
const url = "cluster0-dikpx.gcp.mongodb.net/test?retryWrites=true&w=majority";

/**
 * Connects to MongoDB Server and returns connected client
 * @param {string} usr MongoDB Server user
 * @param {string} pwd MongoDB Server pwd
 * @param {string} url MongoDB Server url
 */
const connectToDb = async function(usr, pwd, url) {
  const uri = `mongodb+srv://${usr}:${pwd}@${url}`;
  
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  await client.connect();
  return client;
};

/**
 * Starts GraphQL server, with MongoDB Client in context Object
 * @param {client: MongoClinet} context The context for GraphQL Server -> MongoDB Client
 */
const runGraphQLServer = function(context) {
  const typeDefs = `
    type Query{

      getAuthor(id: ID!): Author
      getAuthors: [Author]

      getRecipe(id:ID!):Recipe
      getRecipes:[Recipe]

      getIngredient(id:ID!):Ingredient
      getIngredients:[Ingredient]
      
    }

    type Mutation{

      addAuthor(name: String!, mail: String!):Author!
      updateAuthor(id:ID!,name:String,mail:String):Author!
      removeAuthor(author:String!):String

      addRecipe(title:String!,description:String!,author:String!,ingredients:[String!]):Recipe!
      updateRecipe(id:ID!,title:String,description:String,author:String,ingredients:[String]):Recipe!
      removeRecipe(id:ID!):String
      
      addIngredient(name:String!,recipe:String!):Ingredient!
      updateIngredient(id:ID!,name:String,recipe:String):Ingredient!
      removeIngredient(id:ID!):String
    }

    type Author{
      _id: ID!
      name: String!
      mail: String!
      recipes:[Recipe]
    }

    type Ingredient{
      _id: ID!
      name: String!
      recipes: [Recipe!]
    }

    type Recipe{
      _id: ID!
      title: String!
      description: String!
      author: Author!
      ingredients:[Ingredient!]
  }
    `;

  const resolvers = {

    Recipe:{

      ingredients:async (parent, args, ctx, info)=>{
  
        const rec= parent.title;
        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("ingredients");

        const result = await collection.find({"recipe": rec}).toArray();        
        return result;
      },
  
      author:async (parent, args, ctx, info)=>{
  
        const author = parent.author;
        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("authors");

        const result = await collection.findOne({"name": author});
        return result;
      },
  
    },
    Author:{
  
      recipes:async (parent, args, ctx, info)=>{
  

        const name = parent.name;

        const { id } = args;
        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("recipes");
        
        const result = await collection.find({"author": name}).toArray();
        return result;
      },
  
    },
    Ingredient:{
  
      recipes:async (parent, args, ctx, info)=>{
  
        const ingredient = parent.name;
        
        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("recipes");

        const result = await collection.find({"ingredients": ingredient}).toArray();
        return result;
      },
  
    },

    Query: {

      getAuthor: async (parent, args, ctx, info) => {
        const { id } = args;
        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("authors");
        const result = await collection.findOne({ _id: ObjectID(id) });
        return result;
      },
      getAuthors: async (parent, args, ctx, info) => {
        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("authors");
        const result = await collection.find({}).toArray();
        return result;
      },
      getRecipe: async (parent, args, ctx, info) => {

        const { id } = args;
        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("recipes");
        const result = await collection.findOne({ _id: ObjectID(id)});
        return result;

      },
      getRecipes: async (parent, args, ctx, info) => {

        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("recipes");
        const result = await collection.find({}).toArray();
        return result;

      },
      getIngredient: async (parent, args, ctx, info) => {

        const { id } = args;
        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("ingredients");
        const result = await collection.findOne({ _id: ObjectID(id)});
        return result;

      },
      getIngredients: async (parent, args, ctx, info) => {

        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("ingredients");
        const result = await collection.find({}).toArray();
        return result;

      },
      
    },

    Mutation: {

      addAuthor: async (parent, args, ctx, info) => {
        const { name, mail } = args;
        const { client } = ctx;

        const db = client.db("blog");
        const collection = db.collection("authors");
        const result = await collection.insertOne({ name, mail });

        return {
          name,
          mail,
          _id: result.ops[0]._id
        };
      },
      updateAuthor:async (parent, args, ctx, info) => {

        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("authors");

        let result;
        let data = await collection.findOne({ _id: ObjectID(args.id)});

        if(args.name && args.mail){

          result = await collection.updateOne({"_id":ObjectID(args.id)},{$set:{name:args.name,mail:args.mail}});
          result = await collection.findOne({ _id: ObjectID(args.id)});

          return result;

        } else if(args.name){

          result = await collection.updateOne({"_id":ObjectID(args.id)},{$set:{name:args.name,mail:data.mail}});
          result = await collection.findOne({ _id: ObjectID(args.id)});
          return result;

        }else if(args.mail){

          result = await collection.updateOne({"_id":ObjectID(args.id)},{$set:{name:data.name,mail:args.mail}});
          result = await collection.findOne({ _id: ObjectID(args.id)});
          return result;
          
        }
      },
      removeAuthor:async(parent, args, ctx, info) => { //Al borrar un autor borrar todas sus recetas.

        const { client } = ctx;
        const db = client.db("blog");
        let collection = db.collection("authors");
        const result = await collection.findOne({name:args.author});

        if(result){
        
        await collection.deleteOne({name:{$eq:args.author}}); //Borra el autor pero hay que borrar tambien sus recetas

        collection = db.collection("recipes");
        await collection.remove({author:{$eq:args.author}},false);//Borramos las recetas que tengan el nombre del autor borrado
        }
      },

      addRecipe: async (parent, args, ctx, info) => {

        //title:String!,description:String!,author:String!,ingredients:[String!]

        const { title, description,author,ingredients } = args;
        const { client } = ctx;

        const db = client.db("blog");
        let collection = db.collection("authors");

        let result;
        result = await collection.findOne({"name": author});        

        if(result){

          collection = db.collection("recipes");
          result = await collection.insertOne({title, description,author,ingredients });

          collection = db.collection("ingredients");

          let ingredients1 = [];
          let ingredient;

          for(let i = 0;i<ingredients.length;i++){

            ingredient = {
              "name":ingredients[i],
              "recipe":title
            }
            ingredients1.push(ingredient);
          }
  
          await collection.insertMany(ingredients1);

          

          return {
            title,
            description,
            author,
            ingredients,
            _id: result.ops[0]._id
          };

        }

      },
      updateRecipe: async (parent, args, ctx, info) => {


        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("recipes");

        let result;
        let data = await collection.findOne({ _id: ObjectID(args.id)});

        if(args.title){

          result = await collection.updateOne({"_id":ObjectID(args.id)},{$set:{title:args.title}});
          result = await collection.findOne({ _id: ObjectID(args.id)});
        }

        if(args.description){

          result = await collection.updateOne({"_id":ObjectID(args.id)},{$set:{description:args.description}});
          result = await collection.findOne({ _id: ObjectID(args.id)});
        }

        if(args.author){

          result = await collection.updateOne({"_id":ObjectID(args.id)},{$set:{author:args.author}});
          result = await collection.findOne({ _id: ObjectID(args.id)});
        }

        if(args.ingredients){

          result = await collection.updateOne({"_id":ObjectID(args.id)},{$set:{ingredients:args.ingredients}});
          result = await collection.findOne({ _id: ObjectID(args.id)});
        }

        return result;

      },
      removeRecipe: async (parent, args, ctx, info) => {

        //id
        const { id } = args;
        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("recipes");
        const result = await collection.findOne({ _id: ObjectID(id)});

        if(result){
          await collection.deleteOne({_id:{$eq:ObjectID(id)}}); //Borra el autor pero hay que borrar tambien sus recetas
        }
      },

      addIngredient: async (parent, args, ctx, info) => {

        //name:String!,recipe:String!

        const { name,recipe } = args;
        const { client } = ctx;

        const db = client.db("blog");
        const collection = db.collection("ingredients");
        const result = await collection.insertOne({name,recipe});

        return {
          name,
          recipe,
          _id: result.ops[0]._id
        };
      },
      updateIngredient: async (parent, args, ctx, info) => {

          //name:String,recipe:String
          const { client } = ctx;
          const db = client.db("blog");
          const collection = db.collection("ingredients");

          let result;
          let data = await collection.findOne({ _id: ObjectID(args.id)});

          if(args.name && args.recipe){

            result = await collection.updateOne({"_id":ObjectID(args.id)},{$set:{name:args.name,recipe:args.recipe}});
            result = await collection.findOne({ _id: ObjectID(args.id)});

           
            return result;

          }else if(args.name){

            result = await collection.updateOne({"_id":ObjectID(args.id)},{$set:{name:args.name,recipe:data.recipe}});
            result = await collection.findOne({ _id: ObjectID(args.id)});
            return result;

          }else if(args.recipe){

            result = await collection.updateOne({"_id":ObjectID(args.id)},{$set:{name:data.name,recipe:args.recipe}});
            result = await collection.findOne({ _id: ObjectID(args.id)});
            return result;
          }
      },
      removeIngredient: async (parent, args, ctx, info) => { //Al borrar un ingrediente, se borran todas las recetas que lo contengan.

        //id
        //borrar ingrediente y que no aparezca en la receta, aunque creo que eso se puede hacer solo borrando el ingrediente xd

        const { id } = args;
        const { client } = ctx;
        const db = client.db("blog");
        const collection = db.collection("ingredients");
        const result = await collection.findOne({ _id: ObjectID(id)});

        if(result){
          await collection.deleteOne({_id:{$eq:ObjectID(id)}}); //Borra el autor pero hay que borrar tambien sus recetas
        }


      },

    }
  };

  const server = new GraphQLServer({ typeDefs, resolvers, context });
  const options = {
    port: 8000
  };

  try {
    server.start(options, ({ port }) =>
      console.log(
        `Server started, listening on port ${port} for incoming requests.`
      )
    );
  } catch (e) {
    console.info(e);
    server.close();
  }
};

const runApp = async function() {
  const client = await connectToDb(usr, pwd, url);
  console.log("Connect to Mongo DB");
  try {
    runGraphQLServer({ client });
  } catch (e) {
    client.close();
  }
};

runApp();
